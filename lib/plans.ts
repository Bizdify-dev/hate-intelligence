/**
 * Display-layer plan data (name, monthly price, feature copy) for the
 * Intelligence-only UI. Gate logic reads tier limits from PRODUCTS directly
 * (see lib/products.ts) — the limit fields below are spread in from there
 * so the two stay in sync.
 *
 * This file is on the way out: it still backs settings page display, the
 * public landing page, and a few type imports. Slated for deletion once
 * those consumers are migrated.
 */

import { PRODUCTS } from "./products";

export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;          // shown on pricing UI
  questionsPerMonth: number;     // hard limit on /api/ask
  documentLimit: number;         // -1 = unlimited
  maxCharsPerDocument: number;
  features: string[];
  stripePriceIdEnv?: string;     // env var name (NEXT_PUBLIC_*) for the Stripe price
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    questionsPerMonth: 0,
    documentLimit: 0,
    maxCharsPerDocument: 0,
    features: ["Sign up to choose a plan"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    ...PRODUCTS.intelligence.tiers.starter,
    features: [
      "300 questions per month",
      "Up to 10 documents",
      "50,000 chars per document",
      "Email support",
    ],
    stripePriceIdEnv: "NEXT_PUBLIC_STRIPE_PRICE_INTELLIGENCE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 79,
    ...PRODUCTS.intelligence.tiers.pro,
    features: [
      "1,000 questions per month",
      "Unlimited documents",
      "100,000 chars per document",
      "Priority support",
    ],
    stripePriceIdEnv: "NEXT_PUBLIC_STRIPE_PRICE_INTELLIGENCE_PRO",
  },
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}

export function planFromStripePriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return "starter";
  return "free";
}

/**
 * Current month string in 'YYYY-MM' format. Used as the partition key on the usage table.
 * Computing this client-side or server-side gives the same value (UTC).
 */
export function currentMonthKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
