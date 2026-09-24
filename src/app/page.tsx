import { Hero } from "@/components/home/Hero";
import { MarqueeBanner } from "@/components/home/MarqueeBanner";
import { MomentoRouter } from "@/components/home/MomentoRouter";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { LocationSection } from "@/components/home/LocationSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { FinalVideoCta } from "@/components/home/FinalVideoCta";

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
      <FinalVideoCta />
    </>
  );
}
