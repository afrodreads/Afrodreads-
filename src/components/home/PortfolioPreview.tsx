"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";

const CASES: {
  title?: string;
  before: string;
  after: string;
  alt: string;
  beforeAlt?: string;
  afterAlt?: string;
}[] = [
  {
    title: "Revitalização",
    before: "/revitalizacao-antes.jpg",
    after: "/revitalizacao-depois.jpg",
    alt: "Cliente antes e depois da revitalização de dreadlocks na Afro Dreads",
    beforeAlt: "Antes da revitalização",
    afterAlt: "Depois da revitalização",
  },
  {
    title: "Aplicação",
    before: "/microlocs-antes.jpg",
    after: "/microlocs-depois.jpg",
    alt: "Cliente antes e depois da aplicação de dreadlocks na Afro Dreads",
    beforeAlt: "Antes da aplicação",
    afterAlt: "Depois da aplicação",
  },
  {
    title: "Microlocs",
    before: "/aplicacao-2-antes.jpg",
    after: "/aplicacao-2-depois.jpg",
    alt: "Cliente antes e depois da formação de microlocs na Afro Dreads",
    beforeAlt: "Antes dos microlocs",
    afterAlt: "Depois dos microlocs",
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
            <div key={item.before} data-reveal>
              <BeforeAfterSlider
                title={item.title}
                beforeSrc={item.before}
                afterSrc={item.after}
                alt={item.alt}
                beforeAlt={item.beforeAlt}
                afterAlt={item.afterAlt}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
