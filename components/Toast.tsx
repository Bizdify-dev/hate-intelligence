"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "warn";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastInput {
  kind: ToastKind;
  message: string;
  durationMs?: number;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind: input.kind, message: input.message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, input.durationMs ?? 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[260px] max-w-sm border rounded-[2px] px-4 py-3
                        font-mono text-xs leading-relaxed animate-slide-up
                        ${t.kind === "success" ? "border-acid bg-acid/5 text-acid" : ""}
                        ${t.kind === "error" ? "border-red bg-red/5 text-red" : ""}
                        ${t.kind === "warn" ? "border-amber bg-amber/5 text-amber" : ""}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
