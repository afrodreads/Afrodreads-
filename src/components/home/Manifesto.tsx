"use client";

import { motion } from "framer-motion";

export function Manifesto() {
  return (
    <section id="sobre" className="relative overflow-hidden bg-brand-black px-6 py-24">
      <div
        className="stripe-band pointer-events-none absolute -right-24 -top-24 h-72 w-72 rotate-12 opacity-10"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-4xl text-center"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow">
          Nosso manifesto
        </p>
        <h2 className="font-display text-3xl uppercase leading-tight text-brand-white sm:text-5xl">
          Dread não é <span className="text-brand-yellow">tendência</span>.
          <br />
          É <span className="text-brand-yellow">raiz</span>, é resistência,
          <br />
          é identidade que cresce com você.
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-base text-brand-white/70 sm:text-lg">
          Cada fio é tratado com técnica e respeito à sua história. Aqui, formação e
          manutenção de dreadlocks e microlocs são feitas com cuidado real — sem pressa,
          sem fórmula pronta, do jeito que sua cabeça pede.
        </p>
      </motion.div>
    </section>
  );
}
