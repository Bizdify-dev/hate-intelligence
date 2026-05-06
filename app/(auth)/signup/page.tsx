"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/upgrade`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is enabled in Supabase, session will be null and
    // user must click the link in their inbox. Otherwise, we get a session straight away.
    if (data.session) {
      router.push("/upgrade");
      router.refresh();
    } else {
      setInfo(
        "Check your inbox to confirm your email. The link will bring you back to choose a plan."
      );
      setLoading(false);
    }
  }

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
            Free trial
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tighter mb-1">
            Create your account
          </h1>
          <p className="text-ink-dim text-sm mb-8">
            No credit card required. Pick a plan when you ask your first question.
          </p>

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
                autoComplete="new-password"
                minLength={8}
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Same again"
              />
            </div>

            {error && (
              <div className="border border-red bg-red/5 text-red text-xs font-mono p-3 rounded-[2px]">
                {error}
              </div>
            )}
            {info && (
              <div className="border border-acid bg-acid/5 text-acid text-xs font-mono p-3 rounded-[2px] leading-relaxed">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? "Creating…" : "Create account — free trial"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-line text-center">
            <span className="text-ink-dim text-sm">Already have an account? </span>
            <Link
              href="/login"
              className="text-acid hover:underline text-sm font-medium"
            >
              Sign in
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
