"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceListRow, type ServiceVideo } from "@/components/servicos/ServiceListRow";
import type { ServiceDefinition } from "@/lib/services";

// Videos reais por servico (arquivos em public/services/). Servicos sem
// entrada aqui continuam mostrando o placeholder de foto no ServiceListRow.
const SERVICE_VIDEOS: Record<string, ServiceVideo> = {
  retwist: { src: "/services/retwist.mp4", poster: "/services/retwist-poster.jpg" },
  microlocs: { src: "/services/microlocs.mp4", poster: "/services/microlocs-poster.jpg" },
  "primeira-aplicacao-topo": {
    src: "/services/primeira-aplicacao-topo.mp4",
    poster: "/services/primeira-aplicacao-topo-poster.jpg",
  },
  "cabeca-toda": {
    src: "/services/primeira-aplicacao-cabeca-toda.mp4",
    poster: "/services/primeira-aplicacao-cabeca-toda-poster.jpg",
  },
  "retwist-twist": { src: "/services/start-locs.mp4", poster: "/services/start-locs-poster.jpg" },
  penteados: { src: "/services/penteado.mp4", poster: "/services/penteado-poster.jpg" },
  "short-dread": { src: "/services/short-dread.mp4", poster: "/services/short-dread-poster.jpg" },
  revitalizacao: { src: "/revitalizacao.mp4", poster: "/revitalizacao-poster.jpg" },
  "cultivo-agulhado": {
    src: "/dreads-cultivo-agulhado.mp4",
    poster: "/dreads-cultivo-agulhado-poster.jpg",
  },
};

// Carrossel arrastavel (cards 3:4) em todos os tamanhos de tela, com
// indicador de bolinhas abaixo pra deixar visualmente claro que da pra
// arrastar pro lado (e quantos itens tem).
export function ServiceCarouselList({ services }: { services: ServiceDefinition[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const dragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0 });

  const cardStep = useCallback(() => {
    const track = trackRef.current;
    if (!track?.firstElementChild) return 1;
    return (track.firstElementChild as HTMLElement).getBoundingClientRect().width + 16;
  }, []);

  function scrollToIndex(index: number) {
    trackRef.current?.scrollTo({ left: index * cardStep(), behavior: "smooth" });
  }

  function scrollByAmount(amount: number) {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onScroll() {
      if (!track) return;
      // Nas pontas, o scroll maximo/minimo nem sempre bate exatamente com
      // index * cardStep (arredondamento, ultimo card sem espaco pra
      // "centralizar"), entao os ultimos itens nunca ficavam ativos e o
      // video deles nunca tocava. Forca o primeiro/ultimo indice nos limites.
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 2) {
        setActiveIndex(services.length - 1);
        return;
      }
      if (track.scrollLeft <= 2) {
        setActiveIndex(0);
        return;
      }
      setActiveIndex(Math.round(track.scrollLeft / cardStep()));
    }
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [cardStep]);

  // So permite tocar video quando o carrossel esta visivel na tela.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return; // toque usa o scroll nativo
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => scrollByAmount(-296)}
        aria-label="Serviço anterior"
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
        className="-mx-6 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {services.map((service, index) => (
          <div key={service.slug} className="w-[240px] shrink-0 snap-start sm:w-[280px]">
            <ServiceListRow
              service={service}
              index={index}
              video={SERVICE_VIDEOS[service.slug]}
              active={inView && index === activeIndex}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(296)}
        aria-label="Próximo serviço"
        className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink hover:border-amarelo hover:text-amarelo sm:flex"
      >
        ›
      </button>

      {services.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {services.map((service, index) => (
            <button
              key={service.slug}
              type="button"
              aria-label={`Ver ${service.name}`}
              onClick={() => scrollToIndex(index)}
              className={`h-2 rounded-ad-pill transition-all ${
                index === activeIndex ? "w-7 bg-amarelo" : "w-2 bg-line-strong"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
