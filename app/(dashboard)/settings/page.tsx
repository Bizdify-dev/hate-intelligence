import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLANS, currentMonthKey } from "@/lib/plans";
import { getEntitlement } from "@/lib/access";
import { PRODUCTS } from "@/lib/products";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: usageRow }, entitlement] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single(),
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
  const planName = entitlement ? PLANS[entitlement.plan_tier].name : "Free";
  const planPrice = entitlement ? PLANS[entitlement.plan_tier].priceMonthly : 0;
  const questionsLimit = tier?.questionsPerMonth ?? 0;
  const usage = usageRow?.question_count ?? 0;
  const status = entitlement ? "active" : "inactive";
  const hasCustomer = Boolean(profile?.stripe_customer_id);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="eyebrow mb-3">
          <span className="eyebrow-num">⚙</span>
          <span>/ SETTINGS</span>
        </div>
        <h1 className="font-display font-bold text-4xl tracking-tighter mb-10">
          Account &amp; billing
        </h1>

        {/* Plan card */}
        <section className="bg-bg-2 border border-line-2 rounded-[2px] p-6 mb-5">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-1">
                Current plan
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-2xl tracking-tighter">
                  {planName}
                </span>
                {entitlement && (
                  <span className="font-mono text-xs text-ink-dim">
                    ${planPrice}/month
                  </span>
                )}
                <StatusPill status={status} />
              </div>
            </div>
            {!entitlement ? (
              <Link href="/upgrade" className="btn btn-primary">
                Upgrade
              </Link>
            ) : null}
          </div>

          <div className="border-t border-line pt-4">
            <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-2">
              Usage this month
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-bold text-3xl tracking-tighter">
                {usage}
              </span>
              <span className="text-ink-dim font-mono text-sm">
                / {questionsLimit} questions
              </span>
            </div>
            <div className="h-1.5 bg-bg-3 rounded-[2px] overflow-hidden">
              <div
                className="h-full bg-acid transition-all"
                style={{
                  width: questionsLimit
                    ? `${Math.min(100, (usage / questionsLimit) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </section>

        {/* Billing card */}
        <section className="bg-bg-2 border border-line-2 rounded-[2px] p-6 mb-5">
          <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-3">
            Billing
          </div>
          <p className="text-sm text-ink-dim mb-5 leading-relaxed">
            Update your payment method, download invoices, or cancel your subscription
            via the Stripe Customer Portal.
          </p>
          <SettingsClient
            hasCustomer={hasCustomer}
            email={profile?.email ?? user.email ?? ""}
          />
        </section>

        {/* Account card */}
        <section className="bg-bg-2 border border-line-2 rounded-[2px] p-6">
          <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-3">
            Account
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ink-dim">Signed in as</div>
              <div className="font-mono text-sm text-ink mt-1">
                {profile?.email ?? user.email}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: "Active",     cls: "border-acid text-acid bg-acid/5" },
    trialing:  { label: "Trialing",   cls: "border-acid text-acid bg-acid/5" },
    inactive:  { label: "Inactive",   cls: "border-line-2 text-ink-mute" },
    canceled:  { label: "Canceled",   cls: "border-red text-red bg-red/5" },
    past_due:  { label: "Past due",   cls: "border-amber text-amber bg-amber/5" },
  };
  const m = map[status] || map.inactive;
  return (
    <span
      className={`font-mono text-[10px] tracking-section uppercase border px-2 py-0.5 rounded-full ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
