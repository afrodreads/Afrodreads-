"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";

const GOOGLE_MAPS_URL = "https://share.google/hdE6lHpW06wTsRZvc";
const RATING_SUMMARY = "5,0 ⭐ · 56 avaliações";

export function LocationSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-16 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mb-8 flex flex-col items-start gap-4">
          <AdEyebrow>Onde estamos</AdEyebrow>
          <AdTitle>Localização</AdTitle>
        </div>

        <div
          data-reveal
          className="flex flex-col items-start gap-6 rounded-ad-lg border border-line bg-surface-raised p-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="m-0 text-lg font-semibold text-ink">Pirituba, São Paulo - SP</p>
            <p className="m-0 mt-1 text-sm text-ink-muted">
              O endereço completo é enviado por WhatsApp após a confirmação do agendamento.
            </p>
            <p className="m-0 mt-3 text-sm font-semibold text-amarelo">{RATING_SUMMARY}</p>
          </div>

          <AdButton href={GOOGLE_MAPS_URL} external className="shrink-0">
            Ver no Google Maps
          </AdButton>
        </div>
      </div>
    </section>
  );
}
