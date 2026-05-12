// SYNCED: keep identical with hate-meetings/lib/access.ts
//
// Per-product access check. Resolves the user's current entitlement for a
// given product, or null if they don't have access. Filters out non-active
// subscriptions (canceled, past_due, etc.) at query time. When a user has
// multiple active entitlements for the same product (e.g. mid-switch race),
// the better tier wins: pro > starter.

import { createAdminClient } from "./supabase/admin";
import type { PlanTier, ProductKey } from "./products";

export type Entitlement = {
  product_key: ProductKey;
  plan_tier: PlanTier;
};

export async function getEntitlement(
  userId: string,
  productKey: ProductKey
): Promise<Entitlement | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("entitlements")
    .select("plan_tier, subscriptions!inner(status)")
    .eq("user_id", userId)
    .eq("product_key", productKey)
    .in("subscriptions.status", ["active", "trialing"]);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ plan_tier: PlanTier }>;
  if (rows.length === 0) return null;

  const tier: PlanTier = rows.some((r) => r.plan_tier === "pro")
    ? "pro"
    : "starter";

  return { product_key: productKey, plan_tier: tier };
}
