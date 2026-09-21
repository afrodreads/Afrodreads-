"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { StripeBand } from "@/components/ui/StripeBand";

export function Hero() {
  return (
    <section className="relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden bg-brand-black">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-poster.jpg"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Gradiente de apoio: garante contraste mesmo sem o vídeo carregado */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-black via-brand-black/85 to-brand-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-brand-black/40" />

      {/* Faixas diagonais amarelas ao fundo — referência à lona de tenda de circo */}
      <div
        className="stripe-band absolute -left-1/4 top-0 h-full w-1/2 -rotate-12 opacity-[0.07]"
        aria-hidden="true"
      />
      <div
        className="stripe-band absolute -right-1/4 top-0 h-full w-1/2 rotate-12 opacity-[0.07]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-block -skew-x-6 bg-brand-yellow px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-brand-black"
        >
          Estúdio de Dreadlocks
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-display text-5xl uppercase leading-[0.95] tracking-tight text-brand-white sm:text-7xl md:text-8xl"
        >
          Sua raiz.
          <br />
          <span className="text-brand-yellow">Sua história.</span>
          <br />
          Seus dreads.
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
          className="mt-10 flex justify-center"
        >
          <Link
            href="/agendamento"
            className="rounded-full bg-brand-yellow px-8 py-3 text-sm font-bold text-brand-black transition-transform hover:scale-105"
          >
            Agendar meu horário
          </Link>
        </motion.div>
      </div>

      <StripeBand className="absolute bottom-0 left-0" height="h-2" />
    </section>
  );
}
