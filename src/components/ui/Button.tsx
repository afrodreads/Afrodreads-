import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "roxo" | "outline" | "ghost" | "black";
type Size = "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-amarelo text-amarelo-on hover:shadow-[0_0_0_4px_theme(colors.amarelo.soft)]",
  roxo: "bg-roxo text-roxo-on",
  outline: "bg-transparent text-ink border border-line-strong hover:bg-surface-raised",
  ghost: "bg-transparent text-ink underline underline-offset-4",
  black: "bg-black text-amarelo hover:shadow-[0_0_0_4px_rgba(0,0,0,0.18)]",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  className?: string;
  children: ReactNode;
};

type LinkProps = BaseProps & {
  href: string;
  external?: boolean;
  onClick?: () => void;
};

type ButtonProps = BaseProps & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

function classesFor({ variant = "primary", size = "md", className }: BaseProps) {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ad-pill font-sans font-semibold uppercase tracking-wide transition-transform hover:-translate-y-0.5 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ""}`;
}

export function AdButton(props: LinkProps | ButtonProps) {
  const { icon, iconPosition = "left", children } = props;
  const content = (
    <>
      {icon && iconPosition === "left" ? icon : null}
      {children}
      {icon && iconPosition === "right" ? icon : null}
    </>
  );

  if ("href" in props && props.href) {
    const { href, external } = props;
    if (external || href.startsWith("http") || href.startsWith("https://wa.me")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={props.onClick}
          className={classesFor(props)}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} onClick={props.onClick} className={classesFor(props)}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonProps;
  return (
    <button
      type={buttonProps.type ?? "button"}
      onClick={buttonProps.onClick}
      disabled={buttonProps.disabled}
      className={`${classesFor(props)} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {content}
    </button>
  );
}
