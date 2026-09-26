import type { Metadata } from "next";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { GalleryFilter } from "@/components/portfolio/GalleryFilter";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { FinalCtaBand } from "@/components/ui/FinalCta";
import { TESTIMONIALS } from "@/lib/testimonials";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Portfólio | Afro Dreads",
  description:
    "Veja antes e depois de dreadlocks, microlocs e retwist feitos na Afro Dreads, em Pirituba, SP.",
  alternates: { canonical: "/portfolio" },
};

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
    before: "/aplicacao-1-antes.jpg",
    after: "/aplicacao-1-depois.jpg",
    alt: "Cliente antes e depois da aplicação de dreadlocks na Afro Dreads",
    beforeAlt: "Antes da aplicação",
    afterAlt: "Depois da aplicação",
  },
  {
    title: "Microlocs",
    before: "/microlocs-antes.jpg",
    after: "/microlocs-depois.jpg",
    alt: "Cliente antes e depois da formação de microlocs na Afro Dreads",
    beforeAlt: "Antes dos microlocs",
    afterAlt: "Depois dos microlocs",
  },
  {
    title: "Aplicação",
    before: "/aplicacao-2-antes.jpg",
    after: "/aplicacao-2-depois.jpg",
    alt: "Cliente antes e depois da aplicação de dreadlocks na Afro Dreads",
    beforeAlt: "Antes da aplicação",
    afterAlt: "Depois da aplicação",
  },
];

export default function PortfolioPage() {
  return (
    <>
      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4">
          <AdEyebrow>Portfólio</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Quem já ficou no estilo, <em>aprova.</em> 🔥
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Milhares de detalhes fazem cada transformação ser única. Veja alguns dos trabalhos
            realizados pela Afro Dreads.
          </p>
        </div>
      </div>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-start gap-2">
            <AdTitle>
              Antes <em>e</em> depois
            </AdTitle>
            <p className="m-0 text-[15px] text-ink-muted">Arraste a barra para comparar.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CASES.map((item) => (
              <BeforeAfterSlider
                key={item.before}
                title={item.title}
                beforeSrc={item.before}
                afterSrc={item.after}
                alt={item.alt}
                beforeAlt={item.beforeAlt}
                afterAlt={item.afterAlt}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24" aria-label="Galeria">
        <div className="mx-auto max-w-6xl">
          <GalleryFilter />
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <AdTitle>
              O que dizem no <em>Google</em>
            </AdTitle>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TESTIMONIALS.slice(0, 3).map((t) => (
              <figure key={t.name} className="m-0 flex flex-col gap-4 rounded-ad-lg border border-line bg-surface-raised p-6">
                <span className="text-amarelo" aria-label="5 de 5 estrelas">★★★★★</span>
                <blockquote className="m-0 font-serif text-[22px] leading-tight text-ink">&ldquo;{t.text}&rdquo;</blockquote>
                <figcaption className="text-sm font-semibold text-ink">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <FinalCtaBand
            title={
              <>
                Seu próximo visual começa <em>aqui.</em>
              </>
            }
            paragraph="Não sabe exatamente qual dread fazer? Sem problema. Conte pra gente como você gostaria de ficar e nossa equipe ajuda você a transformar sua ideia em um projeto personalizado."
            kicker="Vem ficar no estilo com a gente. 💛"
            ctaLabel="Quero falar com a Afro Dreads"
            ctaHref={buildWhatsAppLink("geral")}
          />
        </div>
      </section>
    </>
  );
}
