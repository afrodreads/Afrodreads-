"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE, DURATION, STAGGER, Y_OFFSET } from "@/lib/gsap";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdTag } from "@/components/ui/Tag";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const ARROW = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14">
    <path d="M4 12L12 4M12 4H5.5M12 4v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CARDS = [
  {
    tag: "Primeira vez",
    tagVariant: "amarelo" as const,
    title: "Nunca fiz dreads",
    text: "A gente explica cada método e ajuda você a escolher o visual certo para o seu cabelo.",
    cta: "Quero fazer meus dreads",
    href: buildWhatsAppLink("primeira"),
  },
  {
    tag: "Manutenção",
    tagVariant: "marrom" as const,
    title: "Já tenho dreads",
    text: "Retwist e manutenção para deixar seus dreads bonitos, alinhados e bem cuidados.",
    cta: "Quero fazer manutenção",
    href: buildWhatsAppLink("manutencao"),
  },
  {
    tag: "Revitalização",
    tagVariant: "roxo" as const,
    title: "Vim de outro salão",
    text: "Seus dreads não ficaram como você queria? A gente avalia e recupera o seu visual.",
    cta: "Quero revitalizar",
    href: buildWhatsAppLink("revitalizacao"),
  },
];

export function MomentoRouter() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current!.querySelectorAll("[data-reveal]"), {
          opacity: 0,
          y: Y_OFFSET,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
          scrollTrigger: { trigger: ref.current, start: "top 80%" },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section className="px-6 py-16 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mb-8 flex flex-col items-start gap-4">
          <AdEyebrow>Por onde começar</AdEyebrow>
          <AdTitle>
            Qual é o seu <em>momento?</em>
          </AdTitle>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noreferrer"
              data-reveal
              className="group flex min-h-[200px] flex-col gap-3 rounded-ad-md border border-line bg-surface-raised p-6 text-ink no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(241,187,9,0.1)]"
            >
              <div className="flex items-center justify-between gap-3">
                <AdTag variant={card.tagVariant}>{card.tag}</AdTag>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amarelo text-amarelo-on">
                  {ARROW}
                </span>
              </div>
              <h3 className="m-0 text-[22px] font-medium leading-snug tracking-tight">{card.title}</h3>
              <p className="m-0 text-sm leading-relaxed text-ink-muted">{card.text}</p>
              <span className="mt-auto text-[13px] font-bold uppercase tracking-wide text-amarelo">
                {card.cta} →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
