import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { StyleSimulator } from "@/components/portfolio/StyleSimulator";

const CASES = [
  { before: "/images/portfolio/caso-1-antes.jpg", after: "/images/portfolio/caso-1-depois.jpg", alt: "Formação de dreadlocks" },
  { before: "/images/portfolio/caso-2-antes.jpg", after: "/images/portfolio/caso-2-depois.jpg", alt: "Microlocs" },
  { before: "/images/portfolio/caso-3-antes.jpg", after: "/images/portfolio/caso-3-depois.jpg", alt: "Retwist" },
];

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <h1 className="font-display text-4xl font-bold text-brand-white">
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

      <div className="mt-24">
        <StyleSimulator referenceImageSrc="/images/portfolio/caso-1-depois.jpg" />
      </div>
    </div>
  );
}
