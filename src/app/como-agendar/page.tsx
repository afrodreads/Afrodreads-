import type { Metadata } from "next";
import Link from "next/link";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { FaqAccordion, type FaqItem } from "@/components/ui/FaqAccordion";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { PolicyRules } from "@/components/servicos/PolicyRules";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const TITLE = "Como agendar dreads e microlocs | Afro Dreads Pirituba";
const DESCRIPTION =
  "Passo a passo para agendar na Afro Dreads: orçamento pelo WhatsApp, sinal, formas de pagamento e regras de cancelamento. Estúdio em Pirituba, SP.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/como-agendar" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/como-agendar",
    siteName: "Afro Dreads",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

const STEPS = [
  {
    title: "Chame a gente no WhatsApp",
    text: "Conte o que você quer fazer e envie uma foto do seu cabelo atual e uma referência do visual que você imagina. Se ainda não sabe qual serviço escolher, sem problema: a gente ajuda.",
  },
  {
    title: "Avaliamos o seu cabelo",
    text: "Cada orçamento passa por uma avaliação individual. A gente explica as opções de método para o seu caso e combina o projeto com você.",
  },
  {
    title: "Você recebe o orçamento",
    text: "O valor depende do projeto: comprimento, quantidade, espessura, material, cor e tipo de procedimento. Por isso ele é combinado direto com você, e não aparece em tabela.",
  },
  {
    title: "Escolha o horário pelo seu link",
    text: "Enviamos um link individual para você escolher a data e o horário e confirmar seus dados. Esse link tem prazo de validade: se expirar, é só pedir um novo pelo WhatsApp.",
  },
  {
    title: "Pague o sinal",
    text: "O sinal reserva o seu horário e é pago por Pix, boleto ou cartão de crédito (parcelamento sujeito aos juros do Mercado Pago). O restante é pago no dia do atendimento.",
  },
  {
    title: "Horário confirmado",
    text: "Depois que o agendamento é confirmado, enviamos o endereço completo pelo WhatsApp. O atendimento é com hora marcada, de terça a sábado, das 10h às 18h.",
  },
];

const SEND_ON_WHATSAPP = [
  "Uma foto do seu cabelo atual.",
  "Uma referência do visual que você quer (foto ou vídeo).",
  "O serviço que você tem em mente, ou a dúvida sobre qual escolher.",
  "Se o seu cabelo já tem dreads ou veio de outro salão, conte isso também.",
];

const FAQ: FaqItem[] = [
  {
    question: "Preciso pagar tudo para agendar?",
    answer: "Não. Você paga só o sinal para reservar o horário e o restante no dia do atendimento.",
  },
  {
    question: "De quanto é o sinal?",
    answer:
      "O sinal é fixo, de R$ 50. Em dezembro e em atendimentos por temporada fora de São Paulo, o sinal passa a ser 50% do valor do serviço.",
  },
  {
    question: "Como pago o sinal?",
    answer: "Por Pix, boleto ou cartão de crédito. O parcelamento no cartão está sujeito aos juros do Mercado Pago.",
  },
  {
    question: "Posso cancelar e ter o sinal de volta?",
    answer:
      "Cancelamentos com 2 dias ou mais de antecedência têm o sinal devolvido integralmente. Cancelamentos no mesmo dia ou com 1 dia de antecedência não têm o sinal devolvido.",
  },
  {
    question: "O link de agendamento expirou. E agora?",
    answer: "O link tem prazo de validade. Fale com a gente pelo WhatsApp e enviamos um novo.",
  },
  {
    question: "Quando recebo o endereço?",
    answer: "Depois que o agendamento é confirmado. Ele é enviado pelo WhatsApp; no site mostramos só o bairro, Pirituba.",
  },
];

export default function ComoAgendarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd(FAQ), breadcrumbJsonLd("Como agendar", "/como-agendar")]),
        }}
      />

      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <AdEyebrow>Agendamento</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Como <em>agendar</em>
          </AdTitle>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">
            Tudo começa com uma conversa pelo WhatsApp. Não existe preço fechado no site: cada projeto é avaliado e
            combinado com você, e o horário só é reservado depois do sinal.
          </p>
          <AdButton href={buildWhatsAppLink("geral")} size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
            Quero fazer meu orçamento
          </AdButton>
        </div>
      </div>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="m-0 font-serif text-3xl uppercase text-ink">Passo a passo</h2>
          <ol className="mt-8 flex list-none flex-col gap-6 p-0">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-5">
                <span className="font-serif text-4xl leading-none text-amarelo-text">{index + 1}</span>
                <div>
                  <h3 className="m-0 text-[17px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="m-0 font-serif text-3xl uppercase text-ink">O que enviar no primeiro contato</h2>
          <ul className="mt-6 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-muted">
            {SEND_ON_WHATSAPP.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">
            Quer entender antes o que muda o valor e quanto tempo leva cada serviço? Veja os guias{" "}
            <Link href="/guias/quanto-custa-fazer-dreads" className="text-ink underline underline-offset-4">
              quanto custa fazer dreads
            </Link>{" "}
            e{" "}
            <Link href="/guias/quanto-tempo-leva-fazer-dreads" className="text-ink underline underline-offset-4">
              quanto tempo leva fazer dreads
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start gap-4">
            <AdEyebrow>Regras</AdEyebrow>
            <AdTitle>
              Sinal e <em>cancelamento</em>
            </AdTitle>
            <p className="m-0 max-w-xl text-[15px] text-ink-muted">Regras simples para o seu horário ficar garantido.</p>
          </div>
          <PolicyRules />
        </div>
      </section>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 flex flex-col items-center gap-4 text-center">
            <AdEyebrow>Dúvidas</AdEyebrow>
            <AdTitle center>
              Perguntas sobre o <em>agendamento</em>
            </AdTitle>
          </div>
          <FaqAccordion items={FAQ} />
          <p className="mt-8 text-center text-[15px] text-ink-muted">
            Outras dúvidas sobre os serviços estão em{" "}
            <Link href="/servicos" className="text-ink underline underline-offset-4">
              serviços
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
