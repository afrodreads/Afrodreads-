"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials";

const GOOGLE_REVIEWS_URL = "https://share.google/hdE6lHpW06wTsRZvc";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amarelo" aria-label={`${rating} de 5 estrelas`}>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const dragState = useRef<{ dragging: boolean; startX: number; startScrollLeft: number }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const cardStep = useCallback(() => {
    const track = trackRef.current;
    if (!track?.firstElementChild) return 1;
    return (track.firstElementChild as HTMLElement).getBoundingClientRect().width + 16;
  }, []);

  function scrollByAmount(amount: number) {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  function scrollToIndex(index: number) {
    trackRef.current?.scrollTo({ left: index * cardStep(), behavior: "smooth" });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onScroll() {
      if (!track) return;
      setActiveIndex(Math.round(track.scrollLeft / cardStep()));
    }
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [cardStep]);

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
        className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink hover:border-amarelo hover:text-amarelo sm:flex"
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
            className="w-[300px] shrink-0 select-none rounded-ad-md border border-line bg-surface-raised p-6"
            style={{ scrollSnapAlign: "start" }}
          >
            <Stars rating={testimonial.rating} />
            <p className="mt-4 font-serif text-2xl leading-tight text-ink">&ldquo;{testimonial.text}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-ink">{testimonial.name}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(320)}
        aria-label="Próximos depoimentos"
        className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink hover:border-amarelo hover:text-amarelo sm:flex"
      >
        ›
      </button>

      <div className="mt-6 flex justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-label={`Ir para depoimento ${index + 1}`}
            onClick={() => scrollToIndex(index)}
            className={`h-2 rounded-ad-pill transition-all ${
              index === activeIndex ? "w-7 bg-amarelo" : "w-2 bg-line-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function ReviewsSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="bg-surface-sunken px-6 py-16 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="flex flex-col items-start gap-4">
          <AdEyebrow>Avaliações</AdEyebrow>
          <AdTitle>
            Quem já ficou no estilo, <em>aprova.</em> 🔥
          </AdTitle>
        </div>

        <ReviewsCarousel items={TESTIMONIALS} />

        <div className="mt-8 flex justify-center">
          <AdButton href={GOOGLE_REVIEWS_URL} external variant="outline">
            Ver todas as avaliações no Google
          </AdButton>
        </div>
      </div>
    </section>
  );
}
