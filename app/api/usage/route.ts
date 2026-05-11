import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan, currentMonthKey } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: usageRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("usage")
      .select("question_count")
      .eq("user_id", user.id)
      .eq("month", currentMonthKey())
      .eq("product", "intelligence")
      .maybeSingle(),
  ]);

  const plan = getPlan(profile?.plan);

  return NextResponse.json({
    plan: plan.id,
    limit: plan.questionsPerMonth,
    count: usageRow?.question_count ?? 0,
    subscriptionActive: profile?.subscription_status === "active",
  });
}
