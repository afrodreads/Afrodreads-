"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { StripeBand } from "@/components/ui/StripeBand";

// Duração total da "corrida" de entrada — o balanço/aceno contínuo (definido
// em globals.css) começa exatamente quando ela termina de "chegar".
const ENTRANCE_DURATION = 1.6;

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

      {/* Mascote da Afro Dreads: "corre" desde o fundo da tela ao carregar a
          página, para, e fica com um leve balanço/aceno contínuo apontando
          a atenção para o botão de agendar. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex justify-center">
        <div className="hero-mascot-wave">
          <motion.div
            initial={{ opacity: 0, scale: 0.12, y: -280, filter: "blur(10px)" }}
            animate={{
              opacity: 1,
              scale: [0.12, 0.5, 0.35, 0.78, 0.55, 1, 1.05, 1],
              y: [-280, -140, -170, -50, -80, 0, -8, 0],
              filter: [
                "blur(10px)",
                "blur(7px)",
                "blur(5px)",
                "blur(2px)",
                "blur(1px)",
                "blur(0px)",
                "blur(0px)",
                "blur(0px)",
              ],
            }}
            transition={{
              duration: ENTRANCE_DURATION,
              times: [0, 0.25, 0.4, 0.6, 0.72, 0.85, 0.93, 1],
              ease: "easeOut",
            }}
          >
            <Image
              src="/images/hero-mascot.png"
              alt="Personagem da Afro Dreads, sorrindo e de braços abertos"
              width={987}
              height={1239}
              priority
              className="h-[58vh] w-auto max-h-[540px] object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.55)] sm:h-[66vh] sm:max-h-[640px]"
            />
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-[30vh] flex max-w-3xl flex-col items-center px-6 text-center sm:mt-[38vh]">
        {/* Seta sutil, animada, guiando o olhar até o CTA */}
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: ENTRANCE_DURATION + 0.1 }}
          className="mb-3 animate-bounce text-3xl text-brand-yellow"
        >
          ↓
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: ENTRANCE_DURATION + 0.2 }}
        >
          <Link
            href="/agendamento"
            className="rounded-full bg-brand-yellow px-10 py-4 text-sm font-bold text-brand-black shadow-lg shadow-brand-yellow/20 transition-transform hover:scale-105"
          >
            Agendar meu horário
          </Link>

          <p className="mt-3 text-xs text-brand-white/70">
            Sem compromisso · resposta rápida pelo WhatsApp
          </p>
        </motion.div>
      </div>

      <StripeBand className="absolute bottom-0 left-0" height="h-2" />
    </section>
  );
}
