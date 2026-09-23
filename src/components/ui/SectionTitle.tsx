import type { ReactNode } from "react";

// Callers passam a palavra de destaque já dentro de <em> (ex: `Seus <em>dreads</em>.`)
// para manter a API simples — este componente só cuida da tipografia grande em
// serifada uppercase e da cor do <em>.
export function AdTitle({
  as: Tag = "h2",
  children,
  size = "default",
  center = false,
  className,
}: {
  as?: "h1" | "h2";
  children: ReactNode;
  size?: "default" | "hero";
  center?: boolean;
  className?: string;
}) {
  const sizeClass =
    size === "hero"
      ? "text-[clamp(2.5rem,10vw,6rem)] leading-[0.92]"
      : "text-[clamp(2.75rem,7vw,4rem)] leading-[0.95]";

  return (
    <Tag
      className={`m-0 font-serif font-normal uppercase tracking-tight text-ink [&_em]:italic [&_em]:text-amarelo-text ${sizeClass} ${center ? "text-center" : ""} ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
