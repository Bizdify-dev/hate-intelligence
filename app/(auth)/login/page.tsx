"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="border border-red bg-red/5 text-red text-xs font-mono p-3 rounded-[2px]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-dim hover:text-acid transition-colors inline-block mb-8"
        >
          ← Back
        </Link>

        <div className="relative bg-bg-2 border border-line-2 rounded-[2px] p-8 shadow-acid-glow-soft">
          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-acid" />

          <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-2">
            Sign in
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tighter mb-1">
            HATE Intelligence
          </h1>
          <p className="text-ink-dim text-sm mb-8">
            Welcome back. Let&apos;s get to work.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="mt-8 pt-6 border-t border-line text-center">
            <span className="text-ink-dim text-sm">Don&apos;t have an account? </span>
            <Link
              href="/signup"
              className="text-acid hover:underline text-sm font-medium"
            >
              Start free trial →
            </Link>
          </div>
        </div>

        <p className="text-center text-ink-mute text-xs font-mono mt-8 tracking-wider">
          A HATERZ<span className="text-acid">.</span>AI PRODUCT
        </p>
      </div>
    </div>
  );
}
