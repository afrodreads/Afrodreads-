import type { ReactNode } from "react";

export function AdEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-ad-pill border border-line-strong px-3.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amarelo">
      <span aria-hidden="true">✦</span> {children}
    </span>
  );
}
