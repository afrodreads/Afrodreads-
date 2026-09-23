"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";

const CASES = [
  {
    before: "/images/portfolio/caso-1-antes.jpg",
    after: "/images/portfolio/caso-1-depois.jpg",
    alt: "Cliente antes e depois da formação de dreadlocks na Afro Dreads",
  },
  {
    before: "/images/portfolio/caso-2-antes.jpg",
    after: "/images/portfolio/caso-2-depois.jpg",
    alt: "Cliente antes e depois da formação de microlocs na Afro Dreads",
  },
  {
    before: "/images/portfolio/caso-3-antes.jpg",
    after: "/images/portfolio/caso-3-depois.jpg",
    alt: "Cliente antes e depois de um retwist de dreadlocks na Afro Dreads",
  },
];

export function PortfolioPreview() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-16 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col items-start gap-4">
            <AdEyebrow>Transformações</AdEyebrow>
            <AdTitle>
              Antes <em>e</em> depois
            </AdTitle>
          </div>
          <AdButton href="/portfolio" variant="outline">
            Ver portfólio completo
          </AdButton>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CASES.map((item) => (
            <div key={item.alt} data-reveal>
              <BeforeAfterSlider beforeSrc={item.before} afterSrc={item.after} alt={item.alt} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
