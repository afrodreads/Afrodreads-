import { Hero } from "@/components/home/Hero";
import { MarqueeBanner } from "@/components/home/MarqueeBanner";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { LocationSection } from "@/components/home/LocationSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBanner />
      <ServicesSection />
      <PortfolioPreview />
      <LocationSection />
      <ReviewsSection />
    </>
  );
}
