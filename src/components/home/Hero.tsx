"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-poster.jpg"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-brand-black/70 via-brand-black/40 to-brand-black" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand-yellow"
        >
          Estúdio de Dreadlocks
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-display text-4xl font-extrabold leading-tight text-brand-white sm:text-6xl"
        >
          Sua raiz, sua história,
          <br /> seus dreads.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-6 max-w-xl text-base text-brand-white/80 sm:text-lg"
        >
          Formação, manutenção e revitalização de dreadlocks e microlocs com técnica,
          cuidado e identidade.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/agendamento"
            className="rounded-full bg-brand-yellow px-8 py-3 text-sm font-bold text-brand-black transition-transform hover:scale-105"
          >
            Agendar meu horário
          </Link>
          <Link
            href="/portfolio"
            className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold text-brand-white transition-colors hover:border-brand-yellow hover:text-brand-yellow"
          >
            Ver portfólio
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
