import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { EntrarNoClube } from "@/components/clube/EntrarNoClube";

const TITLE = "Clube Afro Dreads | Ofertas para crespos, cacheados e locs";
const DESCRIPTION =
  "Grupo gratuito no WhatsApp com ofertas conferidas pela equipe da Afro Dreads: touca de cetim, shampoo antirresíduo, acessórios para dreads e mais.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/clube" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/clube",
    siteName: "Afro Dreads",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/clube/avatar-640.png", width: 640, height: 640 }],
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION, images: ["/clube/avatar-640.png"] },
};

// Ícones simples em traço (24x24), na cor do texto em volta.
function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-ad-pill bg-amarelo-soft text-amarelo">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

const BENEFICIOS = [
  {
    titulo: "Curadoria de quem entende",
    texto: "Os produtos são escolhidos pela equipe do estúdio, que cuida de dreads, locs e cabelo crespo todos os dias.",
    // Selo de aprovação com check.
    icone: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="m9.5 9 1.7 1.7L14.5 7.4" />
        <path d="M8.5 14.2 7 21l5-2.5 5 2.5-1.5-6.8" />
      </>
    ),
  },
  {
    titulo: "Só produto bem avaliado",
    texto: "Nada de achadinho duvidoso: a gente confere a nota, as vendas e o preço antes de mandar.",
    // Estrela de avaliação.
    icone: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  },
  {
    titulo: "Sem spam",
    texto: "Até 7 ofertas por dia, em horário comercial. Dá para silenciar o grupo e olhar quando quiser.",
    // Sino cortado (sem notificação demais).
    icone: (
      <>
        <path d="M6 16V11a6 6 0 0 1 9.2-5.1" />
        <path d="M18 11v5l1.5 2H6.5" />
        <path d="M10 21a2 2 0 0 0 4 0" />
        <path d="m3 3 18 18" />
      </>
    ),
  },
];

export default function ClubePage() {
  return (
    // Fundo igual ao do vídeo da mascote, para a animação se misturar à página.
    <main className="pb-20 pt-28 sm:pt-32" style={{ backgroundColor: "#0C0C0C" }}>
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-6 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <AdEyebrow>Grupo gratuito no WhatsApp</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Clube <em>Afro Dreads</em>
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Ofertas conferidas para crespos, cacheados e locs, direto no seu WhatsApp. Escolhidas pela equipe do
            estúdio, com preço bom de verdade.
          </p>
          <div className="flex flex-col gap-3">
            <EntrarNoClube />
            <p className="m-0 text-center text-sm text-ink-muted sm:text-left">É grátis, e você sai quando quiser.</p>
          </div>
        </div>
        <div className="mx-auto w-56 sm:w-full sm:max-w-xs">
          <Image
            src="/clube/avatar-640.png"
            alt="Selo do Clube Afro Dreads: a mascote da Afro Dreads saindo de uma sacola de compras"
            width={640}
            height={640}
            priority
            className="h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-5xl px-6">
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="rounded-ad-lg border border-line bg-surface-raised p-6">
              <Icone>{b.icone}</Icone>
              <h2 className="m-0 font-sans text-lg font-semibold text-amarelo-text">{b.titulo}</h2>
              <p className="mb-0 mt-2 leading-relaxed text-ink-muted">{b.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 flex max-w-5xl flex-col items-center gap-8 px-6">
        {/* A mascote da Afro Dreads (mesmo vídeo da home), aqui em loop. */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
          aria-label="Animação da mascote da Afro Dreads apontando para você"
          className="h-[42vh] max-h-[420px] w-auto object-contain"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <EntrarNoClube />
        <div className="flex flex-col gap-2 text-center text-sm leading-relaxed text-ink-muted sm:text-left">
          <p className="m-0">Nunca pedimos dados pessoais, senha ou pagamento pelo grupo. As compras são feitas direto na loja oficial.</p>
          <p className="m-0">
            Alguns links são de afiliado: se você comprar por eles, a Afro Dreads pode receber uma comissão, sem custo
            extra para você.
          </p>
        </div>
      </section>
    </main>
  );
}
