// One-time backfill of subscriptions + entitlements from existing profiles.
// Reads profiles with subscription_status in ('active','trialing'), fetches the
// live Stripe subscription, and writes one matching row each to public.subscriptions
// and public.entitlements (product_key='intelligence', plan_tier from profile.plan).
//
// Idempotent: upserts on stripe_subscription_id and (subscription_id, product_key).
//
// Run from repo root:
//   node --env-file=.env.local scripts/backfill-entitlements.mjs --dry-run
//   node --env-file=.env.local scripts/backfill-entitlements.mjs

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!url || !serviceRole || !stripeKey) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/backfill-entitlements.mjs [--dry-run]"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

console.log(DRY_RUN ? "MODE: dry-run (no writes)" : "MODE: live (writes enabled)");

const { data: profiles, error: profilesErr } = await supabase
  .from("profiles")
  .select("id, email, plan, subscription_status, subscription_id")
  .in("subscription_status", ["active", "trialing"]);

if (profilesErr) {
  console.error("Failed to read profiles:", profilesErr.message);
  process.exit(1);
}

console.log(`Found ${profiles.length} active/trialing profile(s) to consider.\n`);

let processed = 0;
let skipped = 0;
let failed = 0;

for (const p of profiles) {
  const tag = `[${p.email ?? p.id}]`;

  if (!p.subscription_id) {
    console.warn(`${tag} SKIP — profile has no subscription_id`);
    skipped++;
    continue;
  }
  if (p.plan !== "starter" && p.plan !== "pro") {
    console.warn(`${tag} SKIP — plan='${p.plan}' is not starter/pro`);
    skipped++;
    continue;
  }

  try {
    const sub = await stripe.subscriptions.retrieve(p.subscription_id);
    const item = sub.items?.data?.[0];
    const priceId = item?.price?.id;
    const periodEndUnix = sub.current_period_end ?? item?.current_period_end ?? null;

    if (!priceId) {
      console.warn(`${tag} SKIP — Stripe sub ${sub.id} has no price on first item`);
      skipped++;
      continue;
    }

    const subRow = {
      user_id: p.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_end: periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
    };

    console.log(
      `${tag} sub=${sub.id} status=${sub.status} price=${priceId} → entitlement intelligence:${p.plan}`
    );

    if (DRY_RUN) {
      processed++;
      continue;
    }

    const { data: subData, error: subErr } = await supabase
      .from("subscriptions")
      .upsert(subRow, { onConflict: "stripe_subscription_id" })
      .select("id")
      .single();
    if (subErr) throw subErr;

    const { error: entErr } = await supabase
      .from("entitlements")
      .upsert(
        {
          subscription_id: subData.id,
          user_id: p.id,
          product_key: "intelligence",
          plan_tier: p.plan,
        },
        { onConflict: "subscription_id,product_key" }
      );
    if (entErr) throw entErr;

    processed++;
  } catch (e) {
    console.error(`${tag} FAIL —`, e?.message ?? e);
    failed++;
  }
}

console.log(
  `\nDone. processed=${processed} skipped=${skipped} failed=${failed} mode=${
    DRY_RUN ? "dry-run" : "live"
  }`
);
