import { Hero } from "@/components/home/Hero";
import { MarqueeBanner } from "@/components/home/MarqueeBanner";
import { Manifesto } from "@/components/home/Manifesto";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { StyleSimulatorSection } from "@/components/home/StyleSimulatorSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBanner />
      <Manifesto />
      <ServicesSection />
      <PortfolioPreview />
      <StyleSimulatorSection />
    </>
  );
}
