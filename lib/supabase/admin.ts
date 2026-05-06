import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * Use ONLY in trusted server contexts (Stripe webhook, admin operations, usage upserts).
 * Never import this file into anything that runs in the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
