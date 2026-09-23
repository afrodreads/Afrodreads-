import type { ReactNode } from "react";

type Variant = "neutral" | "roxo" | "amarelo" | "marrom" | "folha";

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: "bg-surface-sunken text-ink border-line",
  roxo: "bg-roxo-soft text-roxo-text border-roxo-text",
  amarelo: "bg-amarelo-soft text-amarelo-text border-amarelo-text",
  marrom: "bg-marrom-soft text-marrom-text border-marrom-text",
  folha: "bg-folha-soft text-folha border-folha",
};

export function AdTag({ children, variant = "neutral" }: { children: ReactNode; variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-ad-pill border px-3 py-0.5 font-sans text-[13px] font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
