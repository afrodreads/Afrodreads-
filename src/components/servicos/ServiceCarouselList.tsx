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
};

// Carrossel arrastavel (cards 3:4) em todos os tamanhos de tela, com
// indicador de bolinhas abaixo pra deixar visualmente claro que da pra
// arrastar pro lado (e quantos itens tem).
export function ServiceCarouselList({ services }: { services: ServiceDefinition[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0 });

  const cardStep = useCallback(() => {
    const track = trackRef.current;
    if (!track?.firstElementChild) return 1;
    return (track.firstElementChild as HTMLElement).getBoundingClientRect().width + 16;
  }, []);

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
    <div>
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
            <ServiceListRow service={service} index={index} video={SERVICE_VIDEOS[service.slug]} />
          </div>
        ))}
      </div>

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
