"use client";

interface Props {
  eyebrow: string;
  priceMonthly: number;
  features: string[];
  ctaLabel: string;
  loading?: boolean;
  isCurrent?: boolean;
  highlight?: boolean;
  badgeText?: string;
  onSelect?: () => void;
}

export default function PricingCard({
  eyebrow,
  priceMonthly,
  features,
  ctaLabel,
  loading = false,
  isCurrent = false,
  highlight = false,
  badgeText = "POPULAR",
  onSelect,
}: Props) {
  return (
    <div
      className={`relative bg-bg-2 border rounded-[2px] p-8 transition-all
                  ${highlight ? "border-acid shadow-acid-glow" : "border-line-2"}`}
    >
      {highlight && (
        <div className="absolute -top-3 left-8 bg-acid text-black font-mono text-[10px] tracking-section px-2 py-1 rounded-[2px]">
          {badgeText}
        </div>
      )}
      <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-3">
        {eyebrow}
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="font-display font-bold text-5xl tracking-tightest">
          ${priceMonthly}
        </span>
        <span className="text-ink-mute font-mono text-sm">/ month</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-ink">
            <span className="text-acid mt-0.5">→</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="btn btn-ghost w-full opacity-60 cursor-default">
          Current plan
        </div>
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className={`btn w-full ${highlight ? "btn-primary" : "btn-ghost"}`}
        >
          {loading ? "Redirecting…" : ctaLabel}
        </button>
      )}
    </div>
  );
}
