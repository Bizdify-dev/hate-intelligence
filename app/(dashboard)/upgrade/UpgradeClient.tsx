"use client";

import { useState } from "react";
import PricingCard from "@/components/PricingCard";
import { useToast } from "@/components/Toast";
import type { Plan, PlanId } from "@/lib/plans";

interface Props {
  starter: Plan;
  pro: Plan;
  currentPlan: string;
  subscriptionActive: boolean;
}

export default function UpgradeClient({ starter, pro, currentPlan, subscriptionActive }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function startCheckout(plan: PlanId) {
    setLoading(plan);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
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

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <PricingCard
        plan={starter}
        isCurrent={currentPlan === "starter" && subscriptionActive}
        loading={loading === "starter"}
        onSelect={() => startCheckout("starter")}
      />
      <PricingCard
        plan={pro}
        highlight
        isCurrent={currentPlan === "pro" && subscriptionActive}
        loading={loading === "pro"}
        onSelect={() => startCheckout("pro")}
      />
    </div>
  );
}
