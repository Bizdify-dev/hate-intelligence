import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { currentMonthKey } from "@/lib/plans";
import { getEntitlement } from "@/lib/access";
import { PRODUCTS } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: documents }, { data: usageRow }, entitlement] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, title, content, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("usage")
        .select("question_count")
        .eq("user_id", user.id)
        .eq("month", currentMonthKey())
        .eq("product", "intelligence")
        .maybeSingle(),
      getEntitlement(user.id, "intelligence"),
    ]);

  const tier = entitlement
    ? PRODUCTS.intelligence.tiers[entitlement.plan_tier]
    : null;

  return (
    <DashboardClient
      initialDocuments={documents ?? []}
      planId={entitlement?.plan_tier ?? "free"}
      planLimit={tier?.questionsPerMonth ?? 0}
      planDocLimit={tier?.documentLimit ?? 0}
      planMaxChars={tier?.maxCharsPerDocument ?? 0}
      initialUsage={usageRow?.question_count ?? 0}
      subscriptionActive={!!entitlement}
      upgraded={searchParams.upgraded === "true"}
    />
  );
}
