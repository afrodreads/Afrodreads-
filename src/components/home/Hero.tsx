"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE, DURATION, STAGGER, Y_OFFSET } from "@/lib/gsap";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { HeroLocsVisual } from "@/components/home/HeroLocsVisual";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current!.querySelectorAll("[data-hero-item]"), {
          opacity: 0,
          y: Y_OFFSET,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section className="relative overflow-hidden border-b border-line bg-surface pt-32 sm:pt-24">
      <div ref={ref} className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 pt-6 sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-12 sm:pb-24 sm:pt-16">
        <div className="flex flex-col gap-8">
          <div data-hero-item className="flex flex-col items-start gap-4">
            <AdEyebrow>Afro Dreads</AdEyebrow>
            <AdTitle as="h1" size="hero">
              Vem ficar no <em>estilo</em> com a gente.
            </AdTitle>
          </div>
          <p data-hero-item className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-[17px]">
            Do primeiro dread às manutenções, criamos um visual pensado para combinar com você, seu
            estilo e sua rotina. <strong className="font-semibold text-amarelo">Escolha o comprimento,
            espessura, cor e estilo.</strong> A gente transforma sua ideia em realidade.
          </p>
          <div data-hero-item className="flex flex-wrap gap-3">
            <AdButton
              href={buildWhatsAppLink("geral")}
              size="lg"
              icon={<WhatsAppIcon className="h-5 w-5" />}
            >
              Quero ficar no estilo
            </AdButton>
          </div>
        </div>

        <div data-hero-item>
          <HeroLocsVisual />
        </div>
      </div>
    </section>
  );
}
