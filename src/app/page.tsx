import { Hero } from "@/components/home/Hero";
import { MarqueeBanner } from "@/components/home/MarqueeBanner";
import { Manifesto } from "@/components/home/Manifesto";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { LocationSection } from "@/components/home/LocationSection";
// A seção de avaliações fica desativada até os 5 depoimentos reais serem
// preenchidos em src/components/home/ReviewsSection.tsx (TESTIMONIALS).
// import { ReviewsSection } from "@/components/home/ReviewsSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBanner />
      <Manifesto />
      <ServicesSection />
      <PortfolioPreview />
      <LocationSection />
      {/* <ReviewsSection /> */}
    </>
  );
}
