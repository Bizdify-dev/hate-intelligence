import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import UpgradeClient from "./UpgradeClient";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  const currentPlan = profile?.plan ?? "free";
  const isActive = profile?.subscription_status === "active";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="eyebrow mb-3">
          <span className="eyebrow-num">$</span>
          <span>/ CHOOSE A PLAN</span>
        </div>
        <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tighter mb-3">
          One price<span className="text-acid">.</span> No bullshit.
        </h1>
        <p className="text-ink-dim mb-12 max-w-xl">
          Pick a plan, paste your docs, ask anything. Cancel anytime from Settings.
        </p>

        <UpgradeClient
          starter={PLANS.starter}
          pro={PLANS.pro}
          currentPlan={currentPlan}
          subscriptionActive={isActive}
        />

        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim hover:text-acid transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
