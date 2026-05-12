"use client";

import { useState } from "react";
import PricingCard from "@/components/PricingCard";
import { useToast } from "@/components/Toast";

export type Product = "intelligence" | "meetings" | "everything";
export type Tier = "starter" | "pro";

export interface PriceCard {
  product: Product;
  tier: Tier;
  eyebrow: string;
  priceMonthly: number;
  features: string[];
  highlight?: boolean;
  badgeText?: string;
}

interface Props {
  prices: PriceCard[];
  ownProduct: "intelligence" | "meetings";
  ownTier: Tier | null;
  otherTier: Tier | null;
  otherProductName: string;
}

export default function UpgradeClient({
  prices,
  ownProduct,
  ownTier,
  otherTier,
  otherProductName,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);

  async function startCheckout(product: Product, plan: Tier) {
    const key = `${product}:${plan}`;
    setLoading(key);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ kind: "error", message });
      setLoading(null);
    }
  }

  const otherProduct: "intelligence" | "meetings" =
    ownProduct === "intelligence" ? "meetings" : "intelligence";

  const ownCards = prices.filter((p) => p.product === ownProduct);
  const bundleCards = prices.filter((p) => p.product === "everything");
  const otherCards = prices.filter((p) => p.product === otherProduct);

  const renderCard = (p: PriceCard) => {
    const key = `${p.product}:${p.tier}`;
    // Bundle cards skip the isCurrent indicator in step 9: detecting whether
    // the user is on the bundle (vs two standalone subs at the same tier)
    // would require querying subscriptions.stripe_price_id directly.
    const isCurrent =
      (p.product === ownProduct && ownTier === p.tier) ||
      (p.product === otherProduct && otherTier === p.tier);
    const tierLabel = p.tier.charAt(0).toUpperCase() + p.tier.slice(1);
    const ctaLabel =
      p.product === "everything" ? `Choose Bundle ${tierLabel}` : `Choose ${tierLabel}`;
    return (
      <PricingCard
        key={key}
        eyebrow={p.eyebrow}
        priceMonthly={p.priceMonthly}
        features={p.features}
        ctaLabel={ctaLabel}
        loading={loading === key}
        isCurrent={isCurrent}
        highlight={p.highlight}
        badgeText={p.badgeText}
        onSelect={() => startCheckout(p.product, p.tier)}
      />
    );
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-4">
          {ownProduct === "intelligence" ? "HATE INTELLIGENCE" : "HATE MEETINGS"}
        </div>
        <div className="grid md:grid-cols-2 gap-4">{ownCards.map(renderCard)}</div>
      </section>

      <section id="bundle">
        <div className="font-mono text-[11px] tracking-eyebrow uppercase text-acid mb-4">
          EVERYTHING BUNDLE — BOTH PRODUCTS
        </div>
        <div className="grid md:grid-cols-2 gap-4">{bundleCards.map(renderCard)}</div>
      </section>

      <section>
        <button
          onClick={() => setShowOther((v) => !v)}
          className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim hover:text-ink transition-colors mb-4"
        >
          Or only need {otherProductName}? {showOther ? "↑" : "↓"}
        </button>
        {showOther && (
          <div className="grid md:grid-cols-2 gap-4">{otherCards.map(renderCard)}</div>
        )}
      </section>
    </div>
  );
}
