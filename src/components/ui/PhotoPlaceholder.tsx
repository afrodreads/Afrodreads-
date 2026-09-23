type Variant = "default" | "alt" | "sun";

const VARIANT_GRADIENTS: Record<Variant, string> = {
  default: "radial-gradient(120% 90% at 70% 10%, #791d00 0%, #3a0a38 55%, #000 100%)",
  alt: "radial-gradient(120% 90% at 20% 15%, #650c63 0%, #2a0a29 50%, #000 100%)",
  sun: "radial-gradient(110% 80% at 50% 0%, #8a5a00 0%, #3b1500 55%, #000 100%)",
};

// Bloco visual reutilizado onde ainda não existe uma foto real (o site ainda
// não recebeu as fotos de portfólio/serviços do cliente) — mesmo padrão do
// mockup: gradiente de marca + rótulo tracejado "Foto", em vez de deixar um
// espaço vazio ou quebrado.
export function PhotoPlaceholder({
  label = "Foto",
  variant = "default",
  className,
}: {
  label?: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <div
      className={`relative h-full w-full ${className ?? ""}`}
      style={{ background: VARIANT_GRADIENTS[variant] }}
    >
      <span className="absolute left-4 top-4 rounded-ad-pill border border-dashed border-ink/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">
        {label}
      </span>
    </div>
  );
}
