import type { Metadata } from "next";
import { SERVICES } from "@/lib/services";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { FaqAccordion, type FaqItem } from "@/components/ui/FaqAccordion";
import { FinalCtaBand } from "@/components/ui/FinalCta";
import { ServiceCarouselList } from "@/components/servicos/ServiceCarouselList";
import { PolicyRules } from "@/components/servicos/PolicyRules";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Serviços de Dreadlocks e Microlocs | Afro Dreads Pirituba",
  description:
    "Formação, manutenção, revitalização e microlocs em Pirituba, SP. Veja duração, regras de sinal e cancelamento de cada serviço da Afro Dreads.",
  alternates: { canonical: "/servicos" },
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Dread danifica o cabelo?",
    answer:
      "Quando realizado e cuidado corretamente, o procedimento pode ser compatível com uma rotina saudável de cuidados. Durante o atendimento, orientamos você sobre os cuidados necessários.",
  },
  {
    question: "Posso escolher qualquer cor?",
    answer:
      "Sim. Trabalhamos com diferentes possibilidades de cores e combinações. Você pode nos dizer qual visual deseja e nossa equipe orienta sobre as opções.",
  },
  {
    question: "Posso colocar dreads se meu cabelo for curto?",
    answer:
      "Depende do comprimento e das características do seu cabelo. Durante a avaliação, conseguimos indicar as possibilidades para o seu caso.",
  },
  {
    question: "Vocês fazem manutenção?",
    answer: "Sim. Trabalhamos com diferentes tipos de manutenção, de acordo com a necessidade dos seus dreads.",
  },
  {
    question: "Quanto custa para fazer dreads?",
    answer:
      "O valor depende do projeto: comprimento, quantidade, espessura, material, cor e tipo de procedimento. Por isso, o valor final é combinado diretamente com você pelo WhatsApp.",
  },
  {
    question: "Quanto tempo dura o atendimento?",
    answer:
      "Depende do serviço: uma manutenção leva de 3 a 5 horas, uma primeira aplicação de 3 a 8 horas e microlocs de 8 a 12 horas. Tudo com hora marcada.",
  },
  {
    question: "Onde fica a Afro Dreads?",
    answer: "Em Pirituba, zona noroeste de São Paulo. O endereço completo é enviado depois que o agendamento é confirmado.",
  },
  {
    question: "Vocês fazem tranças?",
    answer: "Não. Trabalhamos com dreads, microlocs e retwist.",
  },
  {
    question: "Como faço para saber qual procedimento é ideal para mim?",
    answer: "É simples. Clique no botão abaixo e fale com nossa equipe pelo WhatsApp — você conta o que deseja e a gente ajuda a encontrar a melhor opção.",
  },
];

export default function ServicosPage() {
  return (
    <>
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
          <ServiceCarouselList services={SERVICES} />
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
