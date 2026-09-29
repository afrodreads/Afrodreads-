import type { Metadata } from "next";
import { SERVICES } from "@/lib/services";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { FAQ_ITEMS } from "@/lib/faq";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { FinalCtaBand } from "@/components/ui/FinalCta";
import { ServiceGridList } from "@/components/servicos/ServiceGridList";
import { PolicyRules } from "@/components/servicos/PolicyRules";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Serviços de Dreadlocks e Microlocs | Afro Dreads Pirituba",
  description:
    "Formação, manutenção, revitalização e microlocs em Pirituba, SP. Veja duração, regras de sinal e cancelamento de cada serviço da Afro Dreads.",
  alternates: { canonical: "/servicos" },
};

export default function ServicosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd(FAQ_ITEMS), breadcrumbJsonLd("Serviços", "/servicos")]),
        }}
      />
      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4">
          <AdEyebrow>Serviços</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Encontre o serviço <em>ideal</em>
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Do primeiro dread às manutenções. O valor depende do seu projeto (comprimento, quantidade,
            espessura, material, cor e tipo de procedimento), por isso o combinamos direto com você.
          </p>
        </div>
      </div>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ServiceGridList services={SERVICES} />
        </div>
      </section>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start gap-4">
            <AdEyebrow>Agendamento</AdEyebrow>
            <AdTitle>
              Sinal e <em>cancelamento</em>
            </AdTitle>
            <p className="m-0 max-w-xl text-[15px] text-ink-muted">Regras simples para o seu horário ficar garantido.</p>
          </div>
          <PolicyRules />
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 flex flex-col items-center gap-4 text-center">
            <AdEyebrow>Dúvidas</AdEyebrow>
            <AdTitle center>
              Perguntas <em>frequentes</em>
            </AdTitle>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
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
