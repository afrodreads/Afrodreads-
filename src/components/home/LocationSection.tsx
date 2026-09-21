"use client";

import { motion } from "framer-motion";

const GOOGLE_MAPS_URL = "https://share.google/hdE6lHpW06wTsRZvc";

const RATING_SUMMARY: string | null = "5,0 ⭐ · 56 avaliações";

export function LocationSection() {
  return (
    <section id="localizacao" className="bg-brand-gray px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow"
        >
          Onde estamos
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-3xl uppercase text-brand-white sm:text-5xl"
        >
          Localização
        </motion.h2>

        <div className="mt-8 flex flex-col items-start gap-6 rounded-2xl border border-white/10 bg-brand-black p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-brand-white">Pirituba, São Paulo - SP</p>
            <p className="mt-1 text-sm text-brand-white/60">
              O endereço completo é enviado por WhatsApp após a confirmação do agendamento.
            </p>
            {RATING_SUMMARY && (
              <p className="mt-3 text-sm font-semibold text-brand-yellow">{RATING_SUMMARY}</p>
            )}
          </div>

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black transition-transform hover:scale-105"
          >
            Ver no Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
