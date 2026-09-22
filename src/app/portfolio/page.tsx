import type { Metadata } from "next";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";

export const metadata: Metadata = {
  title: "Portfólio | Afro Dreads",
  description:
    "Veja antes e depois de dreadlocks, microlocs e retwist feitos na Afro Dreads, em Pirituba, SP.",
  alternates: { canonical: "/portfolio" },
};

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

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <h1 className="font-display text-4xl uppercase text-brand-white sm:text-6xl">
        Portfólio <span className="text-brand-yellow">Afro Dreads</span>
      </h1>
      <p className="mt-3 max-w-2xl text-brand-white/60">
        Arraste o controle para comparar o antes e depois de alguns dos nossos atendimentos.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map((item) => (
          <BeforeAfterSlider key={item.alt} beforeSrc={item.before} afterSrc={item.after} alt={item.alt} />
        ))}
      </div>
    </div>
  );
}
