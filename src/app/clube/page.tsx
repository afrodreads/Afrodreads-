import type { Metadata } from "next";
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

const BENEFICIOS = [
  {
    titulo: "Curadoria de quem entende",
    texto: "Os produtos são escolhidos pela equipe do estúdio, que cuida de dreads, locs e cabelo crespo todos os dias.",
  },
  {
    titulo: "Só produto bem avaliado",
    texto: "Nada de achadinho duvidoso: a gente confere a nota, as vendas e o preço antes de mandar.",
  },
  {
    titulo: "Sem spam",
    texto: "Até 7 ofertas por dia, em horário comercial. Dá para silenciar o grupo e olhar quando quiser.",
  },
];

const EXEMPLOS = ["Touca e fronha de cetim", "Shampoo antirresíduo", "Acessórios e búzios para locs", "Pentes e ferramentas", "Hidratação para crespos"];

export default function ClubePage() {
  return (
    <main className="bg-surface pb-20 pt-28 sm:pt-32">
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
            <p className="m-0 text-sm text-ink-muted">É grátis, e você sai quando quiser.</p>
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
              <h2 className="m-0 font-sans text-lg font-semibold text-amarelo-text">{b.titulo}</h2>
              <p className="mb-0 mt-2 leading-relaxed text-ink-muted">{b.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 max-w-5xl px-6">
        <h2 className="m-0 font-sans text-xl font-semibold text-ink">O que aparece no grupo</h2>
        <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
          {EXEMPLOS.map((e) => (
            <li key={e} className="rounded-ad-pill border border-line-strong px-4 py-2 text-sm text-ink">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 flex max-w-5xl flex-col gap-6 px-6">
        <EntrarNoClube />
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
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
