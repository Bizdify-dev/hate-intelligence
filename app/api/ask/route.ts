import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropic, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, SYSTEM_PROMPT, buildUserMessage } from "@/lib/anthropic";
import { getPlan, currentMonthKey } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AskBody {
  question: string;
  history?: ChatMessage[];
}

export async function POST(req: NextRequest) {
  // ----- Auth -----
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ----- Rate limit (10 req/min/user, in-memory) -----
  const rl = rateLimit(`ask:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Slow down. Try again in a few seconds.",
        resetMs: rl.resetMs,
      },
      { status: 429 }
    );
  }

  // ----- Parse body -----
  let body: AskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "missing_question" }, { status: 400 });
  }

  // ----- Subscription check -----
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 500 });
  }

  if (profile.subscription_status !== "active") {
    return NextResponse.json(
      {
        error: "subscription_required",
        message: "Your subscription isn't active. Choose a plan to start asking.",
      },
      { status: 403 }
    );
  }

  const plan = getPlan(profile.plan);
  if (plan.id === "free") {
    return NextResponse.json(
      { error: "subscription_required", message: "Choose a plan to start asking." },
      { status: 403 }
    );
  }

  // ----- Usage limit check -----
  const month = currentMonthKey();
  const admin = createAdminClient();
  const { data: usageRow } = await admin
    .from("usage")
    .select("question_count")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("product", "intelligence")
    .maybeSingle();

  const currentCount = usageRow?.question_count ?? 0;
  if (currentCount >= plan.questionsPerMonth) {
    return NextResponse.json(
      {
        error: "usage_limit_reached",
        limit: plan.questionsPerMonth,
        count: currentCount,
        message: `You've used all ${plan.questionsPerMonth} questions this month. Upgrade for more.`,
      },
      { status: 403 }
    );
  }

  // ----- Load user's documents -----
  const { data: docs } = await supabase
    .from("documents")
    .select("title, content")
    .eq("user_id", user.id);

  const usableDocs = (docs ?? []).filter((d) => d.content?.trim().length);
  if (usableDocs.length === 0) {
    return NextResponse.json(
      {
        error: "no_documents",
        message: "Add at least one document before asking questions.",
      },
      { status: 400 }
    );
  }

  // ----- Increment usage (upsert) BEFORE the API call -----
  // This is the right tradeoff: a failed Claude call still costs a question, but
  // we prevent retry-loop abuse. Refunds for genuine errors can be handled manually.
  const newCount = currentCount + 1;
  const { error: usageErr } = await admin
    .from("usage")
    .upsert(
      {
        user_id: user.id,
        month,
        product: "intelligence",
        question_count: newCount,
      },
      { onConflict: "user_id,month,product" }
    );
  if (usageErr) {
    return NextResponse.json({ error: "usage_write_failed" }, { status: 500 });
  }

  // ----- Build messages for Claude -----
  const userTurn = buildUserMessage(usableDocs, question);

  const history = (body.history ?? []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );

  // For the latest turn, replace the bare question with the docs+question payload.
  // History (previous Q&A) is sent as-is so Claude has conversational context.
  const messages = [
    ...history,
    { role: "user" as const, content: userTurn },
  ];

  // ----- Call Claude -----
  try {
    const resp = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = resp.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({
      answer: text || "(empty response)",
      usage: { count: newCount, limit: plan.questionsPerMonth },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Anthropic call failed";
    return NextResponse.json(
      { error: "anthropic_error", message },
      { status: 500 }
    );
  }
}
