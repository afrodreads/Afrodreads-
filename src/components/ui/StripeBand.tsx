type StripeBandProps = {
  className?: string;
  height?: string;
};

// Faixa diagonal amarelo/preto — referência à lona de tenda de circo, usada
// como divisor gráfico entre seções.
export function StripeBand({ className = "", height = "h-3" }: StripeBandProps) {
  return <div className={`stripe-band w-full ${height} ${className}`} aria-hidden="true" />;
}
