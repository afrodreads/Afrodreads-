"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/gsap";

type Strand = { left: string; height: string; color: string; bead?: boolean; rotate: number };

const STRANDS: Strand[] = [
  { left: "6%", height: "62%", color: "bg-amarelo", bead: true, rotate: -1.4 },
  { left: "16%", height: "78%", color: "bg-amarelo", rotate: 1.2 },
  { left: "26%", height: "54%", color: "bg-roxo", bead: true, rotate: -1.6 },
  { left: "36%", height: "70%", color: "bg-amarelo", rotate: 1.4 },
  { left: "64%", height: "72%", color: "bg-amarelo", rotate: -1.2 },
  { left: "74%", height: "58%", color: "bg-marrom", bead: true, rotate: 1.6 },
  { left: "84%", height: "80%", color: "bg-amarelo", rotate: -1.4 },
  { left: "93%", height: "64%", color: "bg-folha", bead: true, rotate: 1.2 },
];

// Visual decorativo da Hero: dreads estilizados como divs coloridos (não uma
// foto real), balançando suavemente — cada mecha é um alvo independente do
// GSAP, o que fica mais simples de animar em stagger do que um único SVG.
export function HeroLocsVisual() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const strands = containerRef.current?.querySelectorAll<HTMLElement>("[data-strand]");
      if (!strands?.length) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(strands, {
          scaleY: 0,
          transformOrigin: "top center",
          opacity: 0,
          duration: 0.8,
          ease: EASE,
          stagger: 0.06,
          onComplete: () => {
            strands.forEach((strand, i) => {
              gsap.to(strand, {
                rotate: `+=${i % 2 === 0 ? 3 : -3}`,
                duration: 3 + (i % 3) * 0.4,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
              });
            });
          },
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(strands, { opacity: 1, scaleY: 1 });
      });

      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-ad-lg border border-line bg-surface-raised sm:aspect-auto sm:h-[520px]"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-[46%] h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-black bg-marrom" />
      {STRANDS.map((strand, i) => (
        <div
          key={i}
          data-strand
          className={`absolute -top-4 w-[22px] rounded-ad-pill border-[3px] border-black ${strand.color}`}
          style={{ left: strand.left, height: strand.height, rotate: `${strand.rotate}deg` }}
        >
          {strand.bead && (
            <span className="absolute -left-1.5 top-[38%] h-[22px] w-7 rounded-[6px] border-[3px] border-black bg-roxo" />
          )}
        </div>
      ))}
      <div className="absolute inset-x-6 bottom-6 flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        <span>Vem ficar no estilo</span>
        <span>Afro Dreads</span>
      </div>
    </div>
  );
}
