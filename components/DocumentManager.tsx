"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "./Toast";
import type { PlanId } from "@/lib/plans";

export interface Doc {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  documents: Doc[];
  onChange: (docs: Doc[]) => void;
  planId: PlanId;
  planDocLimit: number;     // -1 = unlimited
  planMaxChars: number;
}

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.markdown";

export default function DocumentManager({
  documents,
  onChange,
  planDocLimit,
  planMaxChars,
}: Props) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const totalChars = documents.reduce((s, d) => s + (d.content?.length ?? 0), 0);
  const docCount = documents.length;
  const atLimit = planDocLimit > 0 && docCount >= planDocLimit;
  const dragging = dragDepth > 0;
  const busy = creating || uploading;

  const limitToast = useCallback(() => {
    toast({
      kind: "warn",
      message: `You've reached your plan's ${planDocLimit}-document limit. Upgrade for more.`,
    });
  }, [toast, planDocLimit]);

  const addDoc = useCallback(async () => {
    if (atLimit) {
      limitToast();
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document", content: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Couldn't create document");
      onChange([data.document, ...documents]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ kind: "error", message });
    } finally {
      setCreating(false);
    }
  }, [atLimit, limitToast, documents, onChange, toast]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (atLimit) {
        limitToast();
        return;
      }
      if (uploading) return;
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/documents", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Upload failed");
        onChange([data.document, ...documents]);
        toast({ kind: "success", message: `Uploaded "${data.document.title}"` });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast({ kind: "error", message });
      } finally {
        setUploading(false);
      }
    },
    [atLimit, limitToast, uploading, documents, onChange, toast]
  );

  const onPickFile = useCallback(() => {
    if (atLimit) {
      limitToast();
      return;
    }
    fileInputRef.current?.click();
  }, [atLimit, limitToast]);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      // Reset so picking the same file twice re-fires.
      e.target.value = "";
    },
    [uploadFile]
  );

  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = atLimit ? "none" : "copy";
  }, [atLimit]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragDepth(0);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      void uploadFile(file);
    },
    [uploadFile]
  );

  const updateDoc = useCallback(
    (id: string, patch: Partial<Pick<Doc, "title" | "content">>) => {
      // Optimistic local update
      const next = documents.map((d) => (d.id === id ? { ...d, ...patch } : d));
      onChange(next);

      // Debounced save
      const existing = saveTimers.current.get(id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(async () => {
        try {
          const res = await fetch("/api/documents", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, ...patch }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || data.error || "Save failed");
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Save failed";
          toast({ kind: "error", message });
        }
      }, 500);
      saveTimers.current.set(id, t);
    },
    [documents, onChange, toast]
  );

  const deleteDoc = useCallback(
    async (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (doc && doc.content.length > 50) {
        if (!confirm("Delete this document? This cannot be undone.")) return;
      }
      // Optimistic remove
      onChange(documents.filter((d) => d.id !== id));
      try {
        const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } catch {
        toast({ kind: "error", message: "Couldn't delete — refresh and try again." });
      }
    },
    [documents, onChange, toast]
  );

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={onFileInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-line flex-shrink-0">
        <div className="eyebrow">
          <span className="eyebrow-num">01</span>
          <span>/ DOCUMENTS</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPickFile}
            disabled={busy || atLimit}
            className="btn btn-ghost py-2 px-3 disabled:opacity-40"
            title={atLimit ? "Plan limit reached" : "Upload .pdf, .docx, .txt, or .md"}
          >
            {uploading ? "Uploading…" : "Upload file"}
          </button>
          <button
            onClick={addDoc}
            disabled={busy || atLimit}
            className="btn btn-ghost py-2 px-3 disabled:opacity-40"
            title={atLimit ? "Plan limit reached" : "Add document"}
          >
            + Add Document
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {documents.length === 0 ? (
          <EmptyState
            onAdd={addDoc}
            onUpload={onPickFile}
            disabled={busy}
            atLimit={atLimit}
            uploading={uploading}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                maxChars={planMaxChars}
                onUpdate={(patch) => updateDoc(doc.id, patch)}
                onDelete={() => deleteDoc(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-line px-5 py-3 flex justify-between items-center font-mono text-[11px] text-ink-mute tracking-wider flex-shrink-0">
        <span>
          {docCount} {docCount === 1 ? "doc" : "docs"}
          {planDocLimit > 0 && ` / ${planDocLimit}`}
        </span>
        <span>{totalChars.toLocaleString()} chars</span>
      </footer>

      {dragging && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center
                     bg-bg/80 backdrop-blur-sm border-2 border-dashed border-acid rounded-[2px]"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5">
            <div className="font-mono text-[11px] tracking-eyebrow uppercase text-acid">
              {atLimit ? "Plan limit reached" : "Drop to upload"}
            </div>
            <div className="font-display font-bold text-2xl tracking-tighter text-ink text-center">
              {atLimit ? "Upgrade for more documents" : ".pdf · .docx · .txt · .md"}
            </div>
            <div className="font-mono text-[11px] text-ink-mute uppercase tracking-eyebrow">
              One file · max 10 MB
            </div>
          </div>
        </div>
      )}

      {uploading && !dragging && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <div className="pointer-events-auto border border-acid bg-bg-2 rounded-[2px] px-4 py-2
                          font-mono text-[11px] uppercase tracking-eyebrow text-acid
                          flex items-center gap-2 animate-slide-up">
            <span className="inline-block w-2 h-2 bg-acid rounded-full animate-pulse" />
            Extracting text…
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  onAdd,
  onUpload,
  disabled,
  atLimit,
  uploading,
}: {
  onAdd: () => void;
  onUpload: () => void;
  disabled: boolean;
  atLimit: boolean;
  uploading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-10 px-3 h-full min-h-[300px]">
      <div className="font-mono text-[11px] tracking-eyebrow uppercase text-acid">
        No documents yet
      </div>
      <h2 className="font-display font-bold text-2xl tracking-tighter max-w-[260px] leading-tight">
        Paste your knowledge.<br />Ask anything.
      </h2>
      <p className="text-ink-dim text-sm max-w-[300px] leading-relaxed">
        Paste your SOPs, policies, FAQs or any internal doc.
        Ask questions. Get answers. No bullshit.
      </p>

      <button
        onClick={onAdd}
        disabled={disabled || atLimit}
        className="btn btn-primary mt-2"
      >
        + Add First Document
      </button>

      <button
        type="button"
        onClick={onUpload}
        disabled={disabled || atLimit}
        className="mt-2 w-full max-w-[340px] border-2 border-dashed border-line-2
                   bg-bg-3 rounded-[2px] px-4 py-6 flex flex-col items-center gap-2
                   transition-colors hover:border-acid hover:text-acid
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line-2"
      >
        <span className="font-mono text-[11px] tracking-eyebrow uppercase text-acid">
          {uploading ? "Uploading…" : "Or drop a file"}
        </span>
        <span className="font-mono text-[11px] text-ink-dim">
          .pdf · .docx · .txt · .md · up to 10 MB
        </span>
      </button>
    </div>
  );
}

function DocCard({
  doc,
  maxChars,
  onUpdate,
  onDelete,
}: {
  doc: Doc;
  maxChars: number;
  onUpdate: (patch: Partial<Pick<Doc, "title" | "content">>) => void;
  onDelete: () => void;
}) {
  const overLimit = maxChars > 0 && doc.content.length > maxChars;

  return (
    <div className="relative bg-bg-2 border border-line-2 rounded-[2px] p-4 pl-5 group transition-all hover:-translate-y-0.5 hover:border-line">
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-acid origin-top scale-y-0 group-hover:scale-y-100 group-focus-within:scale-y-100 transition-transform duration-300" />

      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={doc.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Untitled document"
          className="flex-1 bg-transparent border-none outline-none font-display font-semibold text-[15px] tracking-tight text-ink focus:text-acid placeholder-ink-mute"
        />
        <button
          onClick={onDelete}
          className="text-ink-mute hover:text-red transition-colors w-6 h-6 flex items-center justify-center text-sm"
          title="Delete"
          aria-label="Delete document"
        >
          ✕
        </button>
      </div>

      <div className="relative">
        <textarea
          value={doc.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Paste document content here…"
          rows={5}
          className="w-full bg-bg-3 border border-line rounded-[2px] px-3 pt-3 pb-6 font-mono text-xs leading-relaxed text-ink-dim focus:border-line-2 focus:text-ink focus:outline-none transition-colors resize-y"
        />
        <span
          className={`absolute right-3 bottom-2 font-mono text-[11px] pointer-events-none bg-bg-3 px-1
                      ${overLimit ? "text-red" : "text-ink-mute"}`}
        >
          {doc.content.length.toLocaleString()}
          {maxChars > 0 && ` / ${maxChars.toLocaleString()}`}
        </span>
      </div>

      {overLimit && (
        <div className="mt-2 font-mono text-[11px] text-red">
          Over plan limit. <Link href="/upgrade" className="underline">Upgrade →</Link>
        </div>
      )}
    </div>
  );
}
