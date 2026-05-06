"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "./Toast";
import type { Doc } from "./DocumentManager";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "What is our refund policy?",
  "How do I submit a support ticket?",
  "Summarise the key points in our onboarding doc",
];

interface Props {
  documents: Doc[];
  subscriptionActive: boolean;
  usageCount: number;
  usageLimit: number;
  onUsageBump: (newCount: number) => void;
}

export default function ChatInterface({
  documents,
  subscriptionActive,
  usageCount,
  usageLimit,
  onUsageBump,
}: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const usageBlocked = usageLimit > 0 && usageCount >= usageLimit;
  const hasUsableDocs = documents.some((d) => d.content?.trim().length);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    if (!subscriptionActive) {
      setShowUpgradeModal(true);
      return;
    }
    if (!hasUsableDocs) {
      toast({
        kind: "warn",
        message: "Add at least one document with content before asking questions.",
      });
      return;
    }
    if (usageBlocked) {
      toast({
        kind: "warn",
        message: "You've hit your monthly limit. Upgrade for more.",
      });
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    if (inputRef.current) autoResize(inputRef.current);
    setBusy(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          // Send only previous turns; the server adds the docs to the latest turn.
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "subscription_required") {
          setShowUpgradeModal(true);
          setMessages(messages); // rewind
          return;
        }
        if (data.error === "usage_limit_reached") {
          onUsageBump(data.count ?? usageLimit);
          setMessages(messages);
          toast({ kind: "warn", message: data.message });
          return;
        }
        throw new Error(data.message || data.error || `Error ${res.status}`);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
      if (data.usage?.count) onUsageBump(data.usage.count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `[error] ${message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    if (messages.length === 0) return;
    if (!confirm("Clear the entire chat?")) return;
    setMessages([]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="flex items-center justify-between px-5 py-3 border-b border-line flex-shrink-0">
        <div className="eyebrow">
          <span className="eyebrow-num">02</span>
          <span>/ ASK YOUR DOCUMENTS</span>
        </div>
        <button onClick={clearChat} className="btn btn-ghost py-2 px-3">
          Clear Chat
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 flex flex-col gap-5 min-h-0">
        {messages.length === 0 && !busy ? (
          <EmptyChat
            onPick={(q) => {
              setInput(q);
              if (inputRef.current) {
                inputRef.current.focus();
                autoResize(inputRef.current);
              }
            }}
          />
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={i} content={m.content} />
            ) : (
              <AIBubble key={i} content={m.content} />
            )
          )
        )}
        {busy && <ThinkingBubble />}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-line p-4 flex gap-3 items-end flex-shrink-0"
      >
        <div className="flex-1 bg-bg-3 border border-line-2 rounded-[2px] focus-within:border-acid transition-colors px-3 py-2.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder={
              usageBlocked
                ? "Monthly limit reached — upgrade for more"
                : "Ask a question about your documents…"
            }
            disabled={usageBlocked}
            className="w-full bg-transparent text-sm text-ink placeholder-ink-mute outline-none resize-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !input.trim() || usageBlocked}
          className="btn btn-primary"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function EmptyChat({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-start justify-center h-full max-w-2xl gap-5">
      <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tighter leading-tight">
        Ask your documents.<br />
        Get straight answers<span className="text-acid">.</span>
      </h2>
      <p className="text-ink-dim text-sm max-w-md leading-relaxed">
        HATE Intelligence answers only from documents you&apos;ve added. If something
        isn&apos;t in there, it&apos;ll say so — instead of making it up.
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="font-mono text-xs px-3 py-1.5 border border-line-2 rounded-full text-ink-dim hover:border-acid hover:text-acid hover:-translate-y-px transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="self-end max-w-[75%] bg-acid text-black font-display font-semibold text-sm tracking-tight px-4 py-3 rounded-[12px_12px_2px_12px] whitespace-pre-wrap break-words leading-snug">
      {content}
    </div>
  );
}

function AIBubble({ content }: { content: string }) {
  return (
    <div className="self-start max-w-[85%] flex flex-col gap-1.5">
      <div className="font-mono text-[10px] tracking-eyebrow uppercase text-ink-mute pl-1">
        HATE Intelligence
      </div>
      <div
        className="bg-bg-2 border border-line-2 text-ink px-4 py-3.5 rounded-[2px_12px_12px_12px] text-sm leading-relaxed whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: renderInline(content) }}
      />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="self-start max-w-[85%] flex flex-col gap-1.5">
      <div className="font-mono text-[10px] tracking-eyebrow uppercase text-ink-mute pl-1">
        HATE Intelligence
      </div>
      <div className="bg-bg-2 border border-line-2 px-5 py-4 rounded-[2px_12px_12px_12px] inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-acid animate-thinking" />
        <span className="w-1.5 h-1.5 rounded-full bg-acid animate-thinking [animation-delay:0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-acid animate-thinking [animation-delay:0.3s]" />
      </div>
    </div>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-2 border border-line-2 rounded-[2px] p-6 max-w-md w-full shadow-acid-glow-soft relative">
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-acid" />
        <div className="font-mono text-[11px] tracking-eyebrow uppercase text-acid mb-2">
          Pick a plan
        </div>
        <h3 className="font-display font-bold text-2xl tracking-tighter mb-3">
          One question away from useful.
        </h3>
        <p className="text-sm text-ink-dim mb-6 leading-relaxed">
          You&apos;re signed up — now choose Starter or Pro to start asking. No credit card
          theatre, cancel anytime from Settings.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">
            Not yet
          </button>
          <Link href="/upgrade" className="btn btn-primary">
            Choose a plan →
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny inline formatter — bold **x**, code `x`, escape HTML.
 * Keeps Claude responses readable without pulling in a markdown parser.
 */
function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-bg-3 px-1.5 py-0.5 rounded-[2px] font-mono text-xs">$1</code>'
    );
}
