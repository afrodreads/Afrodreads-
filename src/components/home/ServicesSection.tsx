"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { SERVICES } from "@/lib/services";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

const PLACEHOLDER_VARIANTS = ["default", "alt", "sun"] as const;

// Preview de 5 serviços na home — a lista completa (todos os 7) mora em
// /servicos. Grade assimétrica: os 3 primeiros ocupam 2 colunas, os 2
// últimos ocupam 3 colunas cada (grid de 6 colunas no total).
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
            Todos os detalhes →
          </AdButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {PREVIEW.map((service, index) => (
            <div
              key={service.slug}
              data-reveal
              className={`flex flex-col overflow-hidden rounded-ad-lg border border-line bg-surface-raised sm:col-span-1 ${
                index < 3 ? "lg:col-span-2" : "lg:col-span-3"
              }`}
            >
              <div className="relative h-[200px]">
                <PhotoPlaceholder variant={PLACEHOLDER_VARIANTS[index % PLACEHOLDER_VARIANTS.length]} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-amarelo-text">
                  {service.minHours}h – {service.maxHours}h
                </span>
                <h3 className="m-0 font-serif text-3xl font-normal uppercase leading-none tracking-tight text-ink">
                  {service.name}
                </h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{service.description}</p>
                <AdButton href="/servicos" className="mt-auto self-start">
                  Ver detalhes
                </AdButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
