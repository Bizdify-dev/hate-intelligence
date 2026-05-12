import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanTier } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Stripe webhook receiver. CRITICAL: reads the raw body via req.text() so
 * signature verification operates on the exact bytes Stripe sent.
 *
 * Handled events:
 *  - checkout.session.completed       → upsert sub + entitlements
 *  - customer.subscription.created    → upsert sub + entitlements (defense-in-depth)
 *  - customer.subscription.updated    → upsert sub + entitlements (price changes, plan switches)
 *  - customer.subscription.deleted    → mark sub canceled (entitlement rows are kept; gate filters by status)
 *  - invoice.payment_failed           → mark sub past_due
 *
 * The webhook does NOT write to profiles. Entitlements live entirely in the
 * subscriptions + entitlements tables. user_id is carried on every subscription
 * event via subscription.metadata.supabase_user_id (set by create-checkout-session).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "missing_signature_or_secret" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: "signature_failed", message },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription) break; // non-subscription checkout — ignore
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await syncSubscription(admin, subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(admin, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await admin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as Stripe.Invoice & {
          subscription?: string | null;
        }).subscription;
        if (subId) {
          const { error } = await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
          if (error) throw error;
        }
        break;
      }

      default:
        // Other events: acknowledge so Stripe stops retrying.
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Handler error";
    // 500 → Stripe retries with exponential backoff. Preferred over silent failure.
    return NextResponse.json(
      { error: "handler_failed", message },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Upsert the subscriptions row, then recompute its entitlements from the
 * price metadata. Safe to call repeatedly for the same subscription state.
 */
async function syncSubscription(admin: Admin, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    // Every sub we create via Checkout sets this. Missing it is a fatal misconfig.
    throw new Error(
      `subscription ${subscription.id} has no supabase_user_id in metadata`
    );
  }

  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`subscription ${subscription.id} has no items`);
  }

  const price = item.price;
  const periodEndUnix =
    subscription.current_period_end ??
    (item as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const { data: subRow, error: subErr } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: price.id,
        status: subscription.status,
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
      },
      { onConflict: "stripe_subscription_id" }
    )
    .select("id")
    .single();

  if (subErr) throw subErr;

  // Recompute entitlements: drop stale rows, insert the current set.
  const { error: delErr } = await admin
    .from("entitlements")
    .delete()
    .eq("subscription_id", subRow.id);
  if (delErr) throw delErr;

  const entitlements = parseEntitlements(price.metadata?.entitlements);
  if (entitlements.length === 0) {
    console.warn(
      `[stripe webhook] price ${price.id} has no valid entitlements metadata; sub ${subscription.id} grants nothing`
    );
    return;
  }

  const rows = entitlements.map((e) => ({
    subscription_id: subRow.id,
    user_id: userId,
    product_key: e.product_key,
    plan_tier: e.plan_tier,
  }));

  const { error: insErr } = await admin.from("entitlements").insert(rows);
  if (insErr) throw insErr;
}

/**
 * Parse a comma-separated entitlement spec from price.metadata.entitlements.
 * Example: "intelligence:pro,meetings:pro" → two entitlement rows.
 * Malformed pairs are skipped with a warning so a Stripe-side typo doesn't
 * kill the webhook (Stripe retry wouldn't fix it anyway).
 */
function parseEntitlements(
  meta: string | null | undefined
): Array<{ product_key: string; plan_tier: PlanTier }> {
  if (!meta) return [];
  const out: Array<{ product_key: string; plan_tier: PlanTier }> = [];
  for (const raw of meta.split(",")) {
    const pair = raw.trim();
    if (!pair) continue;
    const [product_key, plan_tier] = pair.split(":").map((s) => s.trim());
    if (!product_key || (plan_tier !== "starter" && plan_tier !== "pro")) {
      console.warn(`[stripe webhook] ignoring malformed entitlement '${pair}'`);
      continue;
    }
    out.push({ product_key, plan_tier });
  }
  return out;
}
