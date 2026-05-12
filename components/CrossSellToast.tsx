"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  message: string;
  ctaHref: string;
  ctaLabel: string;
  // localStorage key — once set, the toast never reappears in this browser.
  storageKey: string;
}

export default function CrossSellToast({ message, ctaHref, ctaLabel, storageKey }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
    setVisible(true);
  }, [storageKey]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] max-w-sm pointer-events-auto">
      <div className="border border-acid bg-bg-2 rounded-[2px] p-4 shadow-acid-glow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="font-mono text-[10px] tracking-section uppercase text-acid">
            CROSS-SELL
          </div>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="font-mono text-xs text-ink-dim hover:text-ink transition-colors leading-none"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-ink leading-relaxed mb-4">{message}</p>
        <Link href={ctaHref} className="btn btn-primary w-full text-center">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
