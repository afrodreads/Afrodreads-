import type { Metadata } from "next";
import Image from "next/image";
import { EntrarNoClube } from "@/components/clube/EntrarNoClube";

// Página ponte: destino dos anúncios do Clube. Uma tela só, um botão, sem distração.
// A página completa (para quem chega pelo Google) continua em /clube.
// Tudo aqui precisa ser verdade: nada de contador de vagas ou número de membros inventado.

const TITLE = "Clube Afro Dreads | Grupo gratuito de ofertas no WhatsApp";
const DESCRIPTION =
  "Ofertas conferidas para locs, tranças, crespos e cacheados, todo dia no seu WhatsApp. Grátis, e você sai quando quiser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Página de campanha: fica fora do Google para não competir com /clube.
  robots: { index: false, follow: true },
  alternates: { canonical: "/clube" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/clube/vip",
    siteName: "Afro Dreads",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/clube/banner-1200x800.jpg", width: 1200, height: 800, alt: "Clube Afro Dreads: ofertas para dreads, tranças, crespos e cacheados. Entre gratuitamente." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/clube/banner-1200x800.jpg"] },
};

// Emojis como na referência: um por cartão.
const ITENS = [
  {
    emoji: "🏪",
    titulo: "Ofertas todo dia",
    texto: "Links da Shopee e do Mercado Livre com preço bom de verdade, conferido antes de mandar.",
  },
  {
    emoji: "💸",
    titulo: "Escolhidas por quem entende",
    texto: "Quem escolhe é a equipe do estúdio, que cuida de dreads, locs e cabelo crespo todos os dias.",
  },
  {
    emoji: "🎟️",
    titulo: "Cupons quando aparecem",
    texto: "Cupom e promoção relâmpago chegam no grupo assim que a gente encontra.",
  },
  {
    emoji: "💆🏾‍♀️",
    titulo: "Pro seu cabelo, não qualquer coisa",
    texto: "Touca de cetim, durag, gel para baby hair, perfume capilar, acessórios para locs e tranças.",
  },
];

export default function ClubeVipPage() {
  return (
    <main className="min-h-screen pb-16 pt-28 sm:pt-32" style={{ backgroundColor: "#0C0C0C" }}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 text-center">
        <Image
          src="/clube/avatar-640.png"
          alt="Selo do Clube Afro Dreads: a mascote da Afro Dreads saindo de uma sacola de compras"
          width={640}
          height={640}
          priority
          className="h-28 w-28 rounded-full"
        />

        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-sans text-2xl font-bold leading-tight text-ink sm:text-3xl">
            Ofertas para locs, tranças, crespos e cacheados no seu WhatsApp
          </h1>
          <p className="m-0 text-base text-amarelo-text">Grupo gratuito do Clube Afro Dreads</p>
        </div>

        <EntrarNoClube variante="whatsapp" origem="pagina-ponte" texto="Entrar no grupo agora" />

        {/* Gatilho de urgência, só com o que é verdade: oferta relâmpago acaba mesmo rápido.
            Não usar contador de vagas: o grupo não tem limite real de vagas agora. */}
        <p className="m-0 inline-flex items-center gap-2 rounded-ad-lg border border-line bg-surface-raised px-4 py-3 text-sm font-semibold text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span aria-hidden="true">⏳</span>
          <span>
            Oferta relâmpago acaba em <span className="text-amarelo-text">horas</span>
          </span>
        </p>

        <section className="mt-2 w-full">
          <h2 className="m-0 mb-4 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-amarelo-text">
            No grupo você vai encontrar
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-left">
            {ITENS.map((i) => (
              <li key={i.titulo} className="flex items-start gap-4 rounded-ad-lg border border-line bg-surface-raised p-4">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {i.emoji}
                </span>
                <div>
                  <p className="m-0 font-semibold text-ink">{i.titulo}</p>
                  <p className="mb-0 mt-1 text-sm leading-relaxed text-ink-muted">{i.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <EntrarNoClube variante="whatsapp" origem="pagina-ponte-fim" texto="Quero entrar no grupo" />

        <div className="flex flex-col gap-2 text-xs leading-relaxed text-ink-muted">
          <p className="m-0">Nunca pedimos dados pessoais, senha ou pagamento pelo grupo. As compras são feitas direto na loja oficial.</p>
          <p className="m-0">
            Alguns links são de afiliado: se você comprar por eles, a Afro Dreads pode receber uma comissão, sem custo
            extra para você.
          </p>
        </div>
      </div>
    </main>
  );
}
