import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on every path except static assets, images, favicon, and the Stripe webhook
  // (which doesn't use Supabase auth and would 401 here).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
