import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col h-screen bg-bg">
      <AppNavbar
        email={profile?.email ?? user.email ?? ""}
        plan={profile?.plan ?? "free"}
        subscriptionStatus={profile?.subscription_status ?? "inactive"}
      />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </main>
      <footer className="border-t border-line px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-ink-mute tracking-wider">
        <span>
          HATE Intelligence is a Haterz<span className="text-acid">.</span>ai product —
          Fuck the Hype. Fix the Work.
        </span>
        <a href="mailto:wtf@haterz.ai" className="hover:text-acid transition-colors">
          wtf@haterz.ai
        </a>
      </footer>
    </div>
  );
}
