import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { SERVICES } from "@/lib/services";
import { aboutPageJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const TITLE = "Sobre a Afro Dreads | Dreads e Microlocs em Pirituba, SP";
const DESCRIPTION =
  "Conheça a história da Afro Dreads, estúdio de dreads e microlocs em Pirituba, SP, nascido em São Luís (MA) e conduzido por Lyon e Thay.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sobre" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/sobre",
    siteName: "Afro Dreads",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

const GOOGLE_REVIEWS = "https://share.google/hdE6lHpW06wTsRZvc";

export default function SobrePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([aboutPageJsonLd(), breadcrumbJsonLd("Sobre", "/sobre")]),
        }}
      />

      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <AdEyebrow>Sobre</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Quem faz a <em>Afro Dreads</em>
          </AdTitle>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">
            A Afro Dreads é um estúdio de dreadlocks e microlocs em Pirituba, na zona noroeste de São Paulo, conduzido
            por Lyon e Thay. Aqui cada projeto começa com uma conversa e uma avaliação individual do seu cabelo.
          </p>
        </div>
      </div>

      <section className="border-b border-line px-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 md:grid-cols-[1.2fr_1fr] md:gap-14">
          <div>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">Nossa história</h2>
            <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-ink-muted">
              <p className="m-0">
                A Afro Dreads nasceu há 10 anos, em São Luís, no Maranhão, a partir da paixão da Thay pelos dreads, uma
                paixão que começou muito antes da criação da marca e que hoje soma 14 anos de experiência e dedicação.
              </p>
              <p className="m-0">
                Desde o início, os dreads foram muito mais do que um trabalho. Eles representam identidade, expressão,
                ancestralidade e uma conexão com a cultura afro-brasileira. É essa relação com a nossa cultura que
                também faz parte da essência da Afro Dreads e da forma como enxergamos cada cabelo.
              </p>
              <p className="m-0">
                Com o crescimento da marca, o Lyon passou a fazer parte dessa construção e, juntos, seguimos
                aprimorando nosso trabalho, buscando novas técnicas e mantendo o cuidado que sempre esteve presente em
                nossa trajetória.
              </p>
              <p className="m-0">
                Hoje, em São Paulo, recebemos cada cliente com a experiência que construímos ao longo dos anos e com o
                compromisso de oferecer um serviço de qualidade, feito com técnica, cuidado e atenção aos detalhes.
              </p>
              <p className="m-0">
                Cada cabelo carrega uma identidade, e para nós é um privilégio fazer parte dessa transformação.
              </p>
              <p className="m-0 font-serif text-2xl text-ink">Seja bem-vindo à Afro Dreads.</p>
            </div>
          </div>
          <Image
            src="/images/lyon-e-thay.jpg"
            alt="Lyon e Thay, fundadores da Afro Dreads, lado a lado e sorrindo"
            width={900}
            height={1350}
            sizes="(min-width: 768px) 40vw, 100vw"
            className="h-auto w-full rounded-ad-lg"
          />
        </div>
      </section>

      <article className="px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          <section>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">O que fazemos</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Formação, manutenção e revitalização de dreads e microlocs, sempre com hora marcada. Cada serviço tem a
              sua página, com descrição e duração:
            </p>
            <ul className="mt-4 flex list-none flex-col gap-2 p-0 text-[15px] text-ink-muted">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link href={`/servicos/${service.slug}`} className="text-ink underline underline-offset-4">
                    {service.name}
                  </Link>
                  : {service.description}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">Como trabalhamos</h2>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-muted">
              <li>
                <strong className="text-ink">Avaliação individual.</strong> Para cada orçamento, avaliamos uma foto do
                seu cabelo atual e uma referência do visual que você quer.
              </li>
              <li>
                <strong className="text-ink">Explicação de cada método.</strong> Se você não sabe qual método escolher,
                a gente explica as opções para o seu caso pelo WhatsApp.
              </li>
              <li>
                <strong className="text-ink">Valor combinado com você.</strong> O valor depende do projeto (comprimento,
                quantidade, espessura, material, cor e tipo de procedimento). Veja como funciona no{" "}
                <Link href="/guias/quanto-custa-fazer-dreads" className="text-ink underline underline-offset-4">
                  guia sobre preço
                </Link>
                .
              </li>
              <li>
                <strong className="text-ink">Hora marcada com sinal.</strong> O horário é reservado com um sinal, e as
                sessões podem durar de 2 a 12 horas, conforme o serviço. As regras de sinal e cancelamento estão em{" "}
                <Link href="/servicos" className="text-ink underline underline-offset-4">
                  serviços
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">O que não fazemos</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              A gente não faz tranças. Trabalhamos com dreads, microlocs e retwist. Se você ainda tem dúvida sobre a
              diferença, o{" "}
              <Link href="/guias/diferenca-entre-dreads-e-microlocs" className="text-ink underline underline-offset-4">
                guia sobre dreads e microlocs
              </Link>{" "}
              ajuda a comparar.
            </p>
          </section>

          <section>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">Onde estamos</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Em Pirituba, zona noroeste de São Paulo. O endereço completo é enviado depois que o agendamento é
              confirmado. Atendemos de terça a sábado, das 10h às 18h, com hora marcada.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Também fazemos atendimentos em temporadas fora de São Paulo. Para saber se há datas abertas, fale com a
              gente pelo WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="m-0 font-serif text-3xl uppercase text-ink">Veja quem já passou por aqui</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Os trabalhos estão no{" "}
              <Link href="/portfolio" className="text-ink underline underline-offset-4">
                portfólio
              </Link>{" "}
              e no{" "}
              <a
                href="https://instagram.com/afrodreads_"
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-4"
              >
                Instagram
              </a>
              . As avaliações de clientes estão no{" "}
              <a href={GOOGLE_REVIEWS} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                Google
              </a>
              .
            </p>
          </section>

          <div>
            <AdButton href={buildWhatsAppLink("geral")} icon={<WhatsAppIcon className="h-4 w-4" />}>
              Falar com a Afro Dreads
            </AdButton>
          </div>
        </div>
      </article>
    </>
  );
}
