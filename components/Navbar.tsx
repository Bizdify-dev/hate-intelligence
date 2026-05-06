"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AppNavbarProps {
  email: string;
  plan: string;
  subscriptionStatus: string;
}

export function AppNavbar({ email, plan, subscriptionStatus }: AppNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = subscriptionStatus === "active";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`font-mono text-[11px] uppercase tracking-eyebrow px-2 py-1 transition-colors
                    ${active ? "text-acid" : "text-ink-dim hover:text-ink"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-line px-4 md:px-6 py-3 flex items-center justify-between gap-4 bg-bg z-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="block">
          <div className="font-mono text-[10px] tracking-eyebrow uppercase text-ink-dim leading-none">
            Haterz<span className="text-acid">.</span>ai
          </div>
          <div className="font-display font-bold text-lg tracking-tighter leading-tight">
            HATE Intelligence
          </div>
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {navLink("/dashboard", "Dashboard")}
        {navLink("/settings", "Settings")}
        {!isActive && navLink("/upgrade", "Upgrade")}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-acid animate-pulse" : "bg-red"
            }`}
            style={isActive ? { boxShadow: "0 0 12px rgba(198,255,61,0.5)" } : undefined}
          />
          <span className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-dim">
            {plan}
          </span>
        </div>
        <span
          className="hidden md:inline font-mono text-[11px] text-ink-mute truncate max-w-[160px]"
          title={email}
        >
          {email}
        </span>
        <button onClick={signOut} className="btn btn-ghost py-1.5 px-3 text-[10px]">
          Sign out
        </button>
      </div>
    </header>
  );
}

export function LandingNavbar() {
  return (
    <header className="border-b border-line px-6 md:px-12 py-4 flex items-center justify-between bg-bg/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[10px] tracking-eyebrow uppercase text-ink-dim leading-none">
          Haterz<span className="text-acid">.</span>ai
        </div>
        <div className="font-display font-bold text-lg tracking-tighter">
          HATE Intelligence
        </div>
      </div>
      <nav className="flex items-center gap-2">
        <a
          href="https://haterz.ai"
          className="btn btn-ghost py-1.5 px-3 text-[10px] hidden sm:inline-flex"
        >
          ← Back to haterz.ai
        </a>
        <Link
          href="/login"
          className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-dim hover:text-acid transition-colors px-3 py-2"
        >
          Login
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Start free trial
        </Link>
      </nav>
    </header>
  );
}
