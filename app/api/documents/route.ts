import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/access";
import { PRODUCTS } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_TEXT = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  return { supabase, user } as const;
}

function titleFromFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  return (dot > 0 ? base.slice(0, dot) : base).trim() || "Untitled Document";
}

function detectKind(file: File): "pdf" | "docx" | "text" | null {
  const type = file.type;
  const name = file.name.toLowerCase();
  if (type === MIME_PDF || name.endsWith(".pdf")) return "pdf";
  if (type === MIME_DOCX || name.endsWith(".docx")) return "docx";
  if (MIME_TEXT.has(type) || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return "text";
  }
  return null;
}

async function extractText(file: File, kind: "pdf" | "docx" | "text"): Promise<string> {
  if (kind === "text") {
    return await file.text();
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (kind === "pdf") {
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }
  // docx
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
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

// POST /api/documents — create a new doc (JSON body) or upload a file (multipart/form-data)
export async function POST(req: NextRequest) {
  const r = await requireUser();
  if ("error" in r) return r.error;

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.toLowerCase().includes("multipart/form-data");

  let title: string;
  let content: string;

  if (isMultipart) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "invalid_form", message: "Couldn't read upload." }, { status: 400 });
    }
    const fileEntry = form.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "missing_file", message: "No file provided." }, { status: 400 });
    }
    if (fileEntry.size === 0) {
      return NextResponse.json({ error: "empty_file", message: "That file is empty." }, { status: 400 });
    }
    if (fileEntry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: "file_too_large",
          limit: MAX_UPLOAD_BYTES,
          message: "File is over the 10 MB upload limit.",
        },
        { status: 400 }
      );
    }
    const kind = detectKind(fileEntry);
    if (!kind) {
      return NextResponse.json(
        {
          error: "unsupported_file_type",
          message: "Only .pdf, .docx, .txt, and .md files are supported.",
        },
        { status: 400 }
      );
    }

    try {
      content = (await extractText(fileEntry, kind)).trim();
    } catch {
      return NextResponse.json(
        { error: "extraction_failed", message: "Couldn't read text from that file." },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json(
        { error: "empty_extraction", message: "No text could be extracted from that file." },
        { status: 400 }
      );
    }
    title = titleFromFilename(fileEntry.name).slice(0, 200);
  } else {
    const body = await req.json().catch(() => null);
    title = (body?.title ?? "Untitled Document").toString().slice(0, 200);
    content = (body?.content ?? "").toString();
  }

  // Plan checks
  const entitlement = await getEntitlement(r.user.id, "intelligence");
  const tier = entitlement
    ? PRODUCTS.intelligence.tiers[entitlement.plan_tier]
    : null;

  if (tier && content.length > tier.maxCharsPerDocument && tier.maxCharsPerDocument > 0) {
    return NextResponse.json(
      {
        error: "char_limit_exceeded",
        limit: tier.maxCharsPerDocument,
        message: `Document exceeds your plan's ${tier.maxCharsPerDocument.toLocaleString()}-char limit.`,
      },
      { status: 403 }
    );
  }

  if (tier && tier.documentLimit > 0) {
    const { count } = await r.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user.id);
    if ((count ?? 0) >= tier.documentLimit) {
      return NextResponse.json(
        {
          error: "document_limit_reached",
          limit: tier.documentLimit,
          message: `You've reached your plan's ${tier.documentLimit}-document limit. Upgrade for more.`,
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

  const entitlement = await getEntitlement(r.user.id, "intelligence");
  const tier = entitlement
    ? PRODUCTS.intelligence.tiers[entitlement.plan_tier]
    : null;

  const patch: { title?: string; content?: string } = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 200);
  if (typeof body.content === "string") {
    if (tier && body.content.length > tier.maxCharsPerDocument && tier.maxCharsPerDocument > 0) {
      return NextResponse.json(
        {
          error: "char_limit_exceeded",
          limit: tier.maxCharsPerDocument,
          message: `Document exceeds your plan's ${tier.maxCharsPerDocument.toLocaleString()}-char limit.`,
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
