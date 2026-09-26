"use client";

import { useState } from "react";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { SafeImage } from "@/components/ui/SafeImage";
import { SERVICES } from "@/lib/services";

type Shot = {
  slug: string;
  title: string;
  tall?: boolean;
  variant: "default" | "alt" | "sun";
  photo?: string;
  alt?: string;
};

const SHOTS: Shot[] = [
  { slug: "primeira-aplicacao-topo", title: "Primeira aplicação", tall: true, variant: "default" },
  { slug: "microlocs", title: "Microlocs", variant: "sun" },
  { slug: "retwist", title: "Retwist", variant: "alt" },
  { slug: "revitalizacao", title: "Revitalização", tall: true, variant: "sun" },
  { slug: "penteados", title: "Penteado", variant: "default" },
  { slug: "microlocs", title: "Microlocs coloridos", variant: "alt" },
  { slug: "cabeca-toda", title: "Primeira aplicação (cabeça toda)", variant: "sun" },
  { slug: "retwist-twist", title: "Start Locs", variant: "alt" },
  { slug: "retwist", title: "Manutenção", variant: "default" },
  {
    slug: "cabeca-toda",
    title: "Primeira aplicação (cabeça toda)",
    variant: "sun",
    photo: "/portfolio-aplicacao-cabeca-toda.jpg",
    alt: "Primeira aplicação de dreadlocks (cabeça toda) feita na Afro Dreads",
  },
  {
    slug: "short-dread",
    title: "Short Dread",
    variant: "default",
    photo: "/portfolio-short-dread.jpg",
    alt: "Short Dread feito na Afro Dreads",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs.jpg",
    alt: "Microlocs feitos na Afro Dreads",
  },
  {
    slug: "retwist",
    title: "Retwist",
    variant: "alt",
    photo: "/portfolio-retwist.jpg",
    alt: "Retwist de dreadlocks feito na Afro Dreads",
  },
];

const FILTERS = [{ slug: "todos", name: "Todos" }, ...SERVICES.map((s) => ({ slug: s.slug, name: s.name }))];

export function GalleryFilter() {
  const [active, setActive] = useState("todos");

  return (
    <div>
      <div role="group" aria-label="Filtrar por serviço" className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.slug}
            type="button"
            onClick={() => setActive(f.slug)}
            aria-pressed={active === f.slug}
            className={`rounded-ad-pill border px-4 py-2 text-sm font-medium transition-colors ${
              active === f.slug
                ? "border-amarelo bg-amarelo text-amarelo-on"
                : "border-line-strong bg-transparent text-ink hover:bg-surface-raised"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[220px]">
        {SHOTS.filter((s) => active === "todos" || s.slug === active).map((shot, index) => (
          <figure
            key={`${shot.slug}-${index}`}
            className={`relative m-0 overflow-hidden rounded-ad-lg border border-line ${
              shot.photo ? "aspect-[3/4] h-auto" : `h-[220px] lg:h-auto ${shot.tall ? "lg:row-span-2" : ""}`
            }`}
          >
            {shot.photo ? (
              <SafeImage
                src={shot.photo}
                alt={shot.alt ?? shot.title}
                fill
                loading="lazy"
                className="object-cover"
                placeholderVariant={shot.variant}
              />
            ) : (
              <PhotoPlaceholder variant={shot.variant} />
            )}
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent p-4 text-ink">
              <b className="text-[16px] font-semibold">{shot.title}</b>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amarelo">Afro Dreads</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
