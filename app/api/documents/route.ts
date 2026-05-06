import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  return { supabase, user } as const;
}

// GET /api/documents — list all docs for the user
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;

  const { data, error } = await r.supabase
    .from("documents")
    .select("id, title, content, created_at, updated_at")
    .eq("user_id", r.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

// POST /api/documents — create a new doc
export async function POST(req: NextRequest) {
  const r = await requireUser();
  if ("error" in r) return r.error;

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "Untitled Document").toString().slice(0, 200);
  const content = (body?.content ?? "").toString();

  // Plan checks
  const { data: profile } = await r.supabase
    .from("profiles")
    .select("plan")
    .eq("id", r.user.id)
    .single();
  const plan = getPlan(profile?.plan);

  if (content.length > plan.maxCharsPerDocument && plan.maxCharsPerDocument > 0) {
    return NextResponse.json(
      {
        error: "char_limit_exceeded",
        limit: plan.maxCharsPerDocument,
        message: `Document exceeds your plan's ${plan.maxCharsPerDocument.toLocaleString()}-char limit.`,
      },
      { status: 403 }
    );
  }

  if (plan.documentLimit > 0) {
    const { count } = await r.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user.id);
    if ((count ?? 0) >= plan.documentLimit) {
      return NextResponse.json(
        {
          error: "document_limit_reached",
          limit: plan.documentLimit,
          message: `You've reached your plan's ${plan.documentLimit}-document limit. Upgrade for more.`,
        },
        { status: 403 }
      );
    }
  }

  const { data, error } = await r.supabase
    .from("documents")
    .insert({ user_id: r.user.id, title, content })
    .select("id, title, content, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}

// PUT /api/documents — update an existing doc (id in body)
export async function PUT(req: NextRequest) {
  const r = await requireUser();
  if ("error" in r) return r.error;

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { data: profile } = await r.supabase
    .from("profiles")
    .select("plan")
    .eq("id", r.user.id)
    .single();
  const plan = getPlan(profile?.plan);

  const patch: { title?: string; content?: string } = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 200);
  if (typeof body.content === "string") {
    if (body.content.length > plan.maxCharsPerDocument && plan.maxCharsPerDocument > 0) {
      return NextResponse.json(
        {
          error: "char_limit_exceeded",
          limit: plan.maxCharsPerDocument,
          message: `Document exceeds your plan's ${plan.maxCharsPerDocument.toLocaleString()}-char limit.`,
        },
        { status: 403 }
      );
    }
    patch.content = body.content;
  }

  const { data, error } = await r.supabase
    .from("documents")
    .update(patch)
    .eq("id", id)
    .eq("user_id", r.user.id)  // RLS also enforces this; belt + braces
    .select("id, title, content, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

// DELETE /api/documents — delete a doc (id in body OR ?id= query)
export async function DELETE(req: NextRequest) {
  const r = await requireUser();
  if ("error" in r) return r.error;

  const url = new URL(req.url);
  let id = url.searchParams.get("id");
  if (!id) {
    const body = await req.json().catch(() => null);
    id = body?.id ?? null;
  }
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { error } = await r.supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", r.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
