import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentMonthKey } from "@/lib/plans";
import { getEntitlement } from "@/lib/access";
import { PRODUCTS } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [entitlement, { data: usageRow }] = await Promise.all([
    getEntitlement(user.id, "intelligence"),
    supabase
      .from("usage")
      .select("question_count")
      .eq("user_id", user.id)
      .eq("month", currentMonthKey())
      .eq("product", "intelligence")
      .maybeSingle(),
  ]);

  const tier = entitlement
    ? PRODUCTS.intelligence.tiers[entitlement.plan_tier]
    : null;

  return NextResponse.json({
    plan: entitlement?.plan_tier ?? "free",
    limit: tier?.questionsPerMonth ?? 0,
    count: usageRow?.question_count ?? 0,
    subscriptionActive: !!entitlement,
  });
}
