import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const planId = body?.plan as PlanId | undefined;

  if (!planId || !(planId in PLANS) || planId === "free") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const priceId =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "missing_price_id", message: `Price ID for ${planId} is not configured.` },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

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
    metadata: {
      supabase_user_id: user.id,
      plan: planId,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: planId,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "no_session_url" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
