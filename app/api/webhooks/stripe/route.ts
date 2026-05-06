import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromStripePriceId } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver. CRITICAL: this route reads the raw request body
 * (req.text()) to verify the signature. If anything between Stripe and us
 * mutates the bytes, signature verification will fail.
 *
 * Handled events:
 *  - checkout.session.completed       → activate subscription
 *  - customer.subscription.updated    → sync plan + status
 *  - customer.subscription.deleted    → revert to free
 *  - invoice.payment_failed           → mark past_due
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
        const userId =
          (session.metadata?.supabase_user_id as string | undefined) ?? null;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Pull the live subscription so we have current price + status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = planFromStripePriceId(priceId);

        if (userId) {
          await admin
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              subscription_id: subscriptionId,
              subscription_status: subscription.status,
              plan,
            })
            .eq("id", userId);
        } else {
          // Fallback: match by customer_id if we somehow lost the metadata
          await admin
            .from("profiles")
            .update({
              subscription_id: subscriptionId,
              subscription_status: subscription.status,
              plan,
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = planFromStripePriceId(priceId);

        await admin
          .from("profiles")
          .update({
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            plan,
          })
          .eq("stripe_customer_id", subscription.customer as string);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await admin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            plan: "free",
          })
          .eq("stripe_customer_id", subscription.customer as string);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await admin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string);
        break;
      }

      default:
        // Other events: acknowledge so Stripe stops retrying
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Handler error";
    // Return 500 so Stripe retries — better than silently swallowing
    return NextResponse.json(
      { error: "handler_failed", message },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
