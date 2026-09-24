"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { SERVICES } from "@/lib/services";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { ServiceCarouselList } from "@/components/servicos/ServiceCarouselList";

// Preview de 5 serviços na home, no mesmo carrossel (com vídeo real onde
// existe) usado na lista completa em /servicos.
const PREVIEW = SERVICES.slice(0, 5);

export function ServicesSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-surface-sunken px-6 py-16 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col items-start gap-4">
            <AdEyebrow>Serviços</AdEyebrow>
            <AdTitle>
              Encontre o serviço ideal para <em>você</em>
            </AdTitle>
          </div>
          <AdButton href="/servicos" variant="outline">
            Todos os serviços →
          </AdButton>
        </div>

        <div data-reveal>
          <ServiceCarouselList services={PREVIEW} />
        </div>
      </div>
    </section>
  );
}
