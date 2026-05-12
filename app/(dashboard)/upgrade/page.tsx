import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/access";
import UpgradeClient, { type PriceCard } from "./UpgradeClient";

export const dynamic = "force-dynamic";

const OWN_PRODUCT = "intelligence" as const;
const OTHER_PRODUCT = "meetings" as const;
const OTHER_PRODUCT_NAME = "HATE Meetings";

// Inline pricing display data. Hand-sync between repos when copy changes.
// Limit numbers below should match lib/products.ts — features are display
// copy, not the gate-enforcement source of truth.
const PRICES: PriceCard[] = [
  {
    product: "intelligence",
    tier: "starter",
    eyebrow: "INTELLIGENCE STARTER",
    priceMonthly: 29,
    features: [
      "300 questions per month",
      "Up to 10 documents",
      "50,000 chars per document",
      "Email support",
    ],
  },
  {
    product: "intelligence",
    tier: "pro",
    eyebrow: "INTELLIGENCE PRO",
    priceMonthly: 79,
    features: [
      "1,000 questions per month",
      "Unlimited documents",
      "100,000 chars per document",
      "Priority support",
    ],
  },
  {
    product: "everything",
    tier: "starter",
    eyebrow: "EVERYTHING STARTER",
    priceMonthly: 45,
    features: [
      "Everything in Intelligence Starter",
      "Everything in Meetings Starter",
      "Save ~25% vs buying separately",
    ],
    highlight: true,
    badgeText: "BEST VALUE",
  },
  {
    product: "everything",
    tier: "pro",
    eyebrow: "EVERYTHING PRO",
    priceMonthly: 119,
    features: [
      "Everything in Intelligence Pro",
      "Everything in Meetings Pro",
      "Save ~25% vs buying separately",
      "Priority support",
    ],
    highlight: true,
    badgeText: "BEST VALUE",
  },
  {
    product: "meetings",
    tier: "starter",
    eyebrow: "MEETINGS STARTER",
    priceMonthly: 29,
    features: [
      "50 transcript summaries per month",
      "50,000 chars per transcript",
      "Email support",
    ],
  },
  {
    product: "meetings",
    tier: "pro",
    eyebrow: "MEETINGS PRO",
    priceMonthly: 79,
    features: [
      "200 transcript summaries per month",
      "150,000 chars per transcript",
      "Priority support",
    ],
  },
];

export default async function UpgradePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [ownEnt, otherEnt] = await Promise.all([
    getEntitlement(user.id, OWN_PRODUCT),
    getEntitlement(user.id, OTHER_PRODUCT),
  ]);

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
        <p className="text-ink-dim mb-10 max-w-xl">
          Pick a plan, paste your docs, ask anything. Cancel anytime from Settings.
        </p>

        {otherEnt && (
          <div className="mb-8 border border-acid bg-acid/5 rounded-[2px] p-5">
            <div className="font-mono text-[11px] tracking-eyebrow uppercase text-acid mb-2">
              YOU ALREADY HAVE {OTHER_PRODUCT_NAME.toUpperCase()}
            </div>
            <p className="text-sm text-ink leading-relaxed mb-3">
              Save ~25% by switching to Everything. You&apos;ll keep both products
              and pay less.
            </p>
            <a
              href="#everything"
              className="font-mono text-[11px] tracking-eyebrow uppercase text-acid hover:underline"
            >
              See Everything ↓
            </a>
          </div>
        )}

        <UpgradeClient
          prices={PRICES}
          ownProduct={OWN_PRODUCT}
          ownTier={ownEnt?.plan_tier ?? null}
          otherTier={otherEnt?.plan_tier ?? null}
          otherProductName={OTHER_PRODUCT_NAME}
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
