"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

const GOOGLE_REVIEWS_URL = "https://share.google/hdE6lHpW06wTsRZvc";

type Testimonial = {
  name: string;
  text: string;
  rating: number;
};

// Depoimentos reais extraídos do Google Maps (Afro Dreads, 5,0 ⭐ · 56 avaliações).
const TESTIMONIALS: Testimonial[] = [
  {
    name: "Tauan P.",
    text: "Atendimento excelente desde o primeiro contato! Os profissionais são extremamente cuidadosos e cobram um preço justo, deixando a experiência incrível! Recomendo demais a Afro Dreads e pra mim são os melhores de SP/MA! Podem ir de olhos fechados!",
    rating: 5,
  },
  {
    name: "Amanda S.",
    text: "Vcs são muito gente boa adorei o atendimento, obrigado por vcs ter mudado meu cabelo e ter realizado um sonho que estava dormindo. Deus abençoe vcs grandemente bjos",
    rating: 5,
  },
  {
    name: "Nayoco P.",
    text: "Me senti confortável do contato no WhatsApp até o atendimento no salão. Profissionais atenciosos e cuidadosos, com muito amor a profissão. Super recomendo não teria um lugar melhor para iniciar esta jornada! Obrigado pelo carinho e cuidado",
    rating: 5,
  },
  {
    name: "Flavio S.",
    text: "Afro Dreads é sinônimo de excelência! Eles mantêm a essência e a beleza dos seus dreads com técnica impecável e respeito pela cultura",
    rating: 5,
  },
  {
    name: "André A.",
    text: "Experiência maravilhosa com o casal da Afro Dreads. São muito atenciosos, simpáticos e sem falar no cuidado que eles tem. Estou muito satisfeito com o resultado final e com certeza retornarei.",
    rating: 5,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-brand-yellow" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true">
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function ReviewsCarousel({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startScrollLeft: number }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

  function scrollByAmount(amount: number) {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return; // toque usa o scroll nativo do navegador
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { dragging: true, startX: e.clientX, startScrollLeft: track.scrollLeft };
    track.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current.dragging || !trackRef.current) return;
    const deltaX = e.clientX - dragState.current.startX;
    trackRef.current.scrollLeft = dragState.current.startScrollLeft - deltaX;
  }

  function handlePointerUp() {
    dragState.current.dragging = false;
  }

  return (
    <div className="relative mt-10">
      <button
        type="button"
        onClick={() => scrollByAmount(-320)}
        aria-label="Depoimentos anteriores"
        className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-brand-black text-brand-white hover:border-brand-yellow sm:flex"
      >
        ‹
      </button>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex cursor-grab gap-4 overflow-x-auto scroll-smooth px-1 py-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((testimonial) => (
          <div
            key={testimonial.name}
            className="w-[280px] shrink-0 select-none rounded-2xl border border-white/10 bg-brand-gray p-6"
            style={{ scrollSnapAlign: "start" }}
          >
            <Stars rating={testimonial.rating} />
            <p className="mt-3 text-sm text-brand-white/80">&ldquo;{testimonial.text}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-brand-white">{testimonial.name}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(320)}
        aria-label="Próximos depoimentos"
        className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-brand-black text-brand-white hover:border-brand-yellow sm:flex"
      >
        ›
      </button>
    </div>
  );
}

export function ReviewsSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section id="avaliacoes" className="bg-brand-black px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow"
        >
          O que dizem sobre a gente
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-3xl uppercase text-brand-white sm:text-5xl"
        >
          Avaliações
        </motion.h2>

        <ReviewsCarousel items={TESTIMONIALS} />

        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-brand-white transition-colors hover:border-brand-yellow hover:text-brand-yellow"
        >
          Ver todas as avaliações no Google
        </a>
      </div>
    </section>
  );
}
