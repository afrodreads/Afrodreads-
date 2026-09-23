import type { ReactNode } from "react";

type IconVariant = "amarelo" | "roxo" | "folha";

const ICON_VARIANT_CLASSES: Record<IconVariant, string> = {
  amarelo: "bg-amarelo text-amarelo-on",
  roxo: "bg-roxo text-roxo-on",
  folha: "bg-folha-soft text-folha",
};

export function ChannelCard({
  href,
  icon,
  iconVariant = "amarelo",
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  iconVariant?: IconVariant;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 rounded-ad-md border border-line bg-surface-raised px-6 py-4 text-ink no-underline transition-colors hover:border-line-strong"
    >
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${ICON_VARIANT_CLASSES[iconVariant]}`}>
        {icon}
      </span>
      <span className="flex flex-col">
        <b className="text-[16px] font-semibold">{title}</b>
        <small className="text-[14px] text-ink-muted">{subtitle}</small>
      </span>
      <span aria-hidden="true" className="ml-auto text-ink-muted">
        ↗
      </span>
    </a>
  );
}
