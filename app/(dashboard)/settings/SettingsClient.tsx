"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface Props {
  hasCustomer: boolean;
  email: string;
}

export default function SettingsClient({ hasCustomer }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function openPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't open portal");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ kind: "error", message });
      setLoadingPortal(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={openPortal}
          disabled={!hasCustomer || loadingPortal}
          className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingPortal ? "Opening…" : "Manage billing →"}
        </button>
        {hasCustomer && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="btn btn-danger"
          >
            Cancel subscription
          </button>
        )}
        <button onClick={signOut} className="btn btn-ghost">
          Sign out
        </button>
      </div>

      {!hasCustomer && (
        <p className="font-mono text-[11px] text-ink-mute">
          No Stripe customer yet. Subscribe via the Upgrade page first.
        </p>
      )}

      {confirmingCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-2 border border-line-2 rounded-[2px] p-6 max-w-md w-full shadow-acid-glow-soft">
            <div className="font-mono text-[11px] tracking-eyebrow uppercase text-red mb-2">
              Confirm
            </div>
            <h3 className="font-display font-bold text-xl tracking-tighter mb-2">
              Cancel subscription?
            </h3>
            <p className="text-sm text-ink-dim mb-6 leading-relaxed">
              You&apos;ll be redirected to Stripe&apos;s portal where you can confirm
              cancellation. Access continues until the end of your billing period.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmingCancel(false)}
                className="btn btn-ghost"
              >
                Keep plan
              </button>
              <button
                onClick={openPortal}
                className="btn btn-danger"
              >
                Continue to Stripe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
