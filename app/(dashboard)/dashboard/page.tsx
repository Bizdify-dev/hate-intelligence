import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { getPlan, currentMonthKey } from "@/lib/plans";

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

  const [{ data: profile }, { data: documents }, { data: usageRow }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("plan, subscription_status, email")
        .eq("id", user.id)
        .single(),
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
        .maybeSingle(),
    ]);

  const plan = getPlan(profile?.plan);
  const subActive = profile?.subscription_status === "active";

  return (
    <DashboardClient
      initialDocuments={documents ?? []}
      planId={plan.id}
      planLimit={plan.questionsPerMonth}
      planDocLimit={plan.documentLimit}
      planMaxChars={plan.maxCharsPerDocument}
      initialUsage={usageRow?.question_count ?? 0}
      subscriptionActive={subActive}
      upgraded={searchParams.upgraded === "true"}
    />
  );
}
