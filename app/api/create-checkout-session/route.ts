import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = "intelligence" | "meetings" | "everything";
type PlanTier = "starter" | "pro";

// Map (product, tier) → env var name holding the Stripe price ID. The
// "everything" product is the bundle whose Stripe price metadata grants
// multiple product entitlements at checkout; env vars use the EVERYTHING
// name to match step 3's wiring.
const PRICE_ENV: Record<`${Product}:${PlanTier}`, string> = {
  "intelligence:starter": "NEXT_PUBLIC_STRIPE_PRICE_INTELLIGENCE_STARTER",
  "intelligence:pro":     "NEXT_PUBLIC_STRIPE_PRICE_INTELLIGENCE_PRO",
  "meetings:starter":     "NEXT_PUBLIC_STRIPE_PRICE_MEETINGS_STARTER",
  "meetings:pro":         "NEXT_PUBLIC_STRIPE_PRICE_MEETINGS_PRO",
  "everything:starter":   "NEXT_PUBLIC_STRIPE_PRICE_EVERYTHING_STARTER",
  "everything:pro":       "NEXT_PUBLIC_STRIPE_PRICE_EVERYTHING_PRO",
};

const VALID_PRODUCTS: readonly Product[] = ["intelligence", "meetings", "everything"];
const VALID_TIERS: readonly PlanTier[] = ["starter", "pro"];

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const product = body?.product as Product | undefined;
  const plan = body?.plan as PlanTier | undefined;

  if (
    !product ||
    !VALID_PRODUCTS.includes(product) ||
    !plan ||
    !VALID_TIERS.includes(plan)
  ) {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected { product, plan }." },
      { status: 400 }
    );
  }

  const envName = PRICE_ENV[`${product}:${plan}`];
  const priceId = process.env[envName];
  if (!priceId) {
    return NextResponse.json(
      {
        error: "missing_price_id",
        message: `${envName} is not configured.`,
      },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      {
        error: "missing_app_url",
        message:
          "NEXT_PUBLIC_APP_URL is not set. Add it to your environment (e.g. https://app.haterz.ai) and redeploy.",
      },
      { status: 500 }
    );
  }

  // Reuse an existing Stripe customer if we have one — keeps billing history clean.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/upgrade`,
    allow_promotion_codes: true,
    // The webhook resolves user_id from subscription.metadata.supabase_user_id
    // (set via subscription_data.metadata below). Entitlements come from the
    // price's metadata.entitlements field, not from anything we put here.
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "no_session_url" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
