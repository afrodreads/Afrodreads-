"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";

export function FinalCtaBand({
  title,
  paragraph,
  kicker,
  ctaLabel,
  ctaHref,
}: {
  title: React.ReactNode;
  paragraph: string;
  kicker?: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-6 rounded-ad-lg bg-amarelo px-6 py-16 text-center text-amarelo-on sm:px-12"
    >
      <h2
        data-reveal
        className="m-0 max-w-3xl font-serif text-[clamp(2.5rem,7vw,5rem)] font-normal uppercase leading-[0.92] tracking-tight [&_em]:italic"
      >
        {title}
      </h2>
      <p data-reveal className="m-0 max-w-xl text-lg leading-relaxed">
        {paragraph}
      </p>
      {kicker && (
        <span data-reveal className="text-sm font-bold uppercase tracking-wide">
          {kicker}
        </span>
      )}
      <span data-reveal>
        <AdButton href={ctaHref} variant="black" size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
          {ctaLabel}
        </AdButton>
      </span>
    </div>
  );
}
