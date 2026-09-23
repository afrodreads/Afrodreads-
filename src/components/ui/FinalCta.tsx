"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE, DURATION, STAGGER, Y_OFFSET } from "@/lib/gsap";
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
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current!.children, {
          opacity: 0,
          y: Y_OFFSET,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-6 rounded-ad-lg bg-amarelo px-6 py-16 text-center text-amarelo-on sm:px-12"
    >
      <AdTitleLocal>{title}</AdTitleLocal>
      <p className="m-0 max-w-xl text-lg leading-relaxed">{paragraph}</p>
      {kicker && <span className="text-sm font-bold uppercase tracking-wide">{kicker}</span>}
      <AdButton href={ctaHref} variant="black" size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
        {ctaLabel}
      </AdButton>
    </div>
  );
}

function AdTitleLocal({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 max-w-3xl font-serif text-[clamp(2.5rem,7vw,5rem)] font-normal uppercase leading-[0.92] tracking-tight [&_em]:italic">
      {children}
    </h2>
  );
}
