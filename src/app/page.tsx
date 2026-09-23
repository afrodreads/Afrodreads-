import { Hero } from "@/components/home/Hero";
import { MarqueeBanner } from "@/components/home/MarqueeBanner";
import { MomentoRouter } from "@/components/home/MomentoRouter";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { LocationSection } from "@/components/home/LocationSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { FinalCtaBand } from "@/components/ui/FinalCta";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBanner />
      <MomentoRouter />
      <ServicesSection />
      <PortfolioPreview />
      <LocationSection />
      <ReviewsSection />
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
