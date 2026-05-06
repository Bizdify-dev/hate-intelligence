import Stripe from "stripe";

/**
 * Server-side Stripe client. Pinned API version for stable webhook payloads.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
