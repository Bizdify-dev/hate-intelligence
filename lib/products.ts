// SYNCED: keep identical with hate-meetings/lib/products.ts
//
// Product registry. Source of truth for per-product tier limits.
// Add a new product here when launching one. Entitlement grants are driven
// by Stripe price metadata (`entitlements: "<product>:<tier>,..."`), not by
// this file — this file only defines what each tier allows.

export const PRODUCTS = {
  intelligence: {
    key: "intelligence",
    name: "HATE Intelligence",
    domain: "app.haterz.ai",
    tiers: {
      starter: {
        questionsPerMonth: 300,
        documentLimit: 10,
        maxCharsPerDocument: 50_000,
      },
      pro: {
        questionsPerMonth: 1000,
        documentLimit: -1,
        maxCharsPerDocument: 100_000,
      },
    },
  },
  meetings: {
    key: "meetings",
    name: "HATE Meetings",
    domain: "meetings.haterz.ai",
    tiers: {
      starter: {
        summariesPerMonth: 50,
        maxCharsPerTranscript: 50_000,
      },
      pro: {
        summariesPerMonth: 200,
        maxCharsPerTranscript: 150_000,
      },
    },
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
export type PlanTier = "starter" | "pro";
