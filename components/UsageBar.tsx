"use client";

import Link from "next/link";

interface Props {
  count: number;
  limit: number;
  plan: string;
  subscriptionActive: boolean;
}

export default function UsageBar({ count, limit, plan, subscriptionActive }: Props) {
  const ratio = limit > 0 ? Math.min(1, count / limit) : 0;
  const pct = Math.round(ratio * 100);

  let barClass = "bg-acid";
  let labelClass = "text-ink-dim";
  if (ratio >= 1) {
    barClass = "bg-red";
    labelClass = "text-red";
  } else if (ratio >= 0.8) {
    barClass = "bg-amber";
    labelClass = "text-amber";
  }

  if (!subscriptionActive) {
    return (
      <div className="px-5 py-3 border-b border-line bg-bg flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-dim">
          No active subscription
        </span>
        <Link href="/upgrade" className="btn btn-primary py-1.5 px-3 text-[10px]">
          Choose a plan
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-2.5 border-b border-line bg-bg">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[11px] uppercase tracking-eyebrow ${labelClass}`}>
            {count.toLocaleString()} / {limit.toLocaleString()} questions
          </span>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
            this month · {plan}
          </span>
        </div>
        {ratio >= 0.8 && (
          <Link
            href="/upgrade"
            className="font-mono text-[10px] uppercase tracking-eyebrow text-acid hover:underline"
          >
            Upgrade →
          </Link>
        )}
      </div>
      <div className="h-1 bg-bg-3 rounded-[2px] overflow-hidden">
        <div
          className={`h-full ${barClass} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
