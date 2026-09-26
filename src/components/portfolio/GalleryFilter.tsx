"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { SafeImage } from "@/components/ui/SafeImage";
import { SERVICES } from "@/lib/services";
import { SERVICE_VIDEOS } from "@/components/servicos/ServiceCarouselList";

type ShotVideo = { src: string; poster: string };

type Shot = {
  slug: string;
  title: string;
  tall?: boolean;
  variant: "default" | "alt" | "sun";
  photo?: string;
  video?: ShotVideo;
  alt?: string;
};

// Categorias que existem so no portfolio (nao sao servicos agendaveis com
// preco/duracao proprios), entao nao vem de SERVICES.
const EXTRA_CATEGORIES = [
  { slug: "dread-sintetico-twist", name: "Dread Sintético + Twist" },
  { slug: "manutencao", name: "Manutenção" },
  { slug: "manutencao-interlock", name: "Manutenção Interlock" },
];

const SHOTS: Shot[] = [
  {
    slug: "cabeca-toda",
    title: "Primeira aplicação (cabeça toda)",
    variant: "sun",
    photo: "/portfolio-aplicacao-cabeca-toda.jpg",
    alt: "Primeira aplicação de dreadlocks (cabeça toda) feita na Afro Dreads",
  },
  ...[
    "Cliente sorrindo com dreadlocks castanho-claros na cabeça toda",
    "Dreadlocks longos castanho-acobreados na cabeça toda, vistos de trás",
    "Dreadlocks pretos na cabeça toda, vistos de cima",
    "Dreadlocks pretos com pontas loiras na cabeça toda, vistos de lado",
    "Dreadlocks longos loiros na cabeça toda, vistos de trás",
  ].map(
    (alt, i): Shot => ({
      slug: "cabeca-toda",
      title: "Primeira aplicação (cabeça toda)",
      variant: "sun",
      photo: `/portfolio-cabeca-toda-${i + 2}.jpg`,
      alt,
    }),
  ),
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
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-2.jpg",
    alt: "Início da formação de microlocs, com as divisões da raiz aparentes",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-3.jpg",
    alt: "Microlocs recém-formados vistos de cima",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-4.jpg",
    alt: "Microlocs finalizados vistos de trás",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-5.jpg",
    alt: "Microlocs acobreados vistos de lado",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-6.jpg",
    alt: "Microlocs acobreados vistos de cima, com as divisões da raiz",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    photo: "/portfolio-microlocs-7.jpg",
    alt: "Microlocs acobreados erguidos mostrando as divisões da nuca",
  },
  {
    slug: "microlocs",
    title: "Microlocs",
    variant: "sun",
    video: { src: "/microlocs-2.mp4", poster: "/microlocs-2-poster.jpg" },
    alt: "Vídeo de microlocs feitos na Afro Dreads",
  },
  ...[3, 4, 5, 6].map(
    (n): Shot => ({
      slug: "microlocs",
      title: "Microlocs",
      variant: "sun",
      video: { src: `/microlocs-${n}.mp4`, poster: `/microlocs-${n}-poster.jpg` },
      alt: "Vídeo do processo de microlocs na Afro Dreads",
    }),
  ),
  {
    slug: "retwist",
    title: "Retwist",
    variant: "alt",
    photo: "/portfolio-retwist.jpg",
    alt: "Retwist de dreadlocks feito na Afro Dreads",
  },
  {
    slug: "retwist",
    title: "Retwist",
    variant: "alt",
    video: { src: "/retwist-2.mp4", poster: "/retwist-2-poster.jpg" },
    alt: "Vídeo de retwist na raiz dos dreadlocks na Afro Dreads",
  },
  {
    slug: "retwist-twist",
    title: "Start Locs",
    variant: "alt",
    photo: "/portfolio-start-locs.jpg",
    alt: "Start Locs feito na Afro Dreads",
  },
  {
    slug: "retwist-twist",
    title: "Start Locs",
    variant: "alt",
    video: { src: "/start-locs-2.mp4", poster: "/start-locs-2-poster.jpg" },
    alt: "Vídeo do processo de Start Locs na Afro Dreads",
  },
  {
    slug: "dread-sintetico-twist",
    title: "Dread Sintético + Twist",
    variant: "sun",
    photo: "/portfolio-dread-sintetico-twist.jpg",
    alt: "Dread sintético com twist feito na Afro Dreads",
  },
  {
    slug: "primeira-aplicacao-topo",
    title: "Primeira aplicação (topo)",
    variant: "default",
    photo: "/portfolio-primeira-aplicacao-topo.jpg",
    alt: "Primeira aplicação de dreadlocks (topo) feita na Afro Dreads",
  },
  ...[2, 3, 4, 5].map(
    (n): Shot => ({
      slug: "primeira-aplicacao-topo",
      title: "Primeira aplicação (topo)",
      variant: "default",
      video: {
        src: `/primeira-aplicacao-topo-${n}.mp4`,
        poster: `/primeira-aplicacao-topo-${n}-poster.jpg`,
      },
      alt: "Vídeo de primeira aplicação de dreadlocks (topo) na Afro Dreads",
    }),
  ),
  {
    slug: "manutencao",
    title: "Manutenção",
    variant: "default",
    video: { src: "/manutencao.mp4", poster: "/manutencao-poster.jpg" },
    alt: "Manutenção de dreadlocks feita na Afro Dreads",
  },
  {
    slug: "manutencao-interlock",
    title: "Manutenção Interlock",
    variant: "alt",
    video: { src: "/manutencao-interlock.mp4", poster: "/manutencao-interlock-poster.jpg" },
    alt: "Manutenção Interlock de dreadlocks feita na Afro Dreads",
  },
];

// Os videos da pagina de Servicos tambem aparecem no portfolio, cada um na
// categoria do proprio servico.
const SERVICE_VIDEO_SHOTS: Shot[] = SERVICES.filter((s) => SERVICE_VIDEOS[s.slug]).map((s) => ({
  slug: s.slug,
  title: s.name,
  variant: "default",
  video: SERVICE_VIDEOS[s.slug],
  alt: `${s.name} feito na Afro Dreads`,
}));

const ALL_SHOTS = [...SHOTS, ...SERVICE_VIDEO_SHOTS];

const FILTERS = [
  { slug: "todos", name: "Todos" },
  ...SERVICES.map((s) => ({ slug: s.slug, name: s.name })),
  ...EXTRA_CATEGORIES,
];

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
        {/* Key pela posicao na lista completa: com o indice da lista filtrada,
            trocar de filtro reaproveitava o card de outro item (ex.: uma foto
            virava video) e o video nunca ligava o autoplay. */}
        {ALL_SHOTS.map((shot, index) => ({ shot, index }))
          .filter(({ shot }) => active === "todos" || shot.slug === active)
          .map(({ shot, index }) => (
            <GalleryShot key={index} shot={shot} />
          ))}
      </div>
    </div>
  );
}

function GalleryShot({ shot }: { shot: Shot }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasMedia = Boolean(shot.photo || shot.video);

  // Cada card de video no portfolio tem seu proprio IntersectionObserver
  // (diferente do carrossel de servicos): aqui os cards ficam numa grade
  // normal da pagina, entao mais de um pode tocar ao mesmo tempo sem o
  // problema de decodificacao que existia no carrossel horizontal.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (el.readyState === 0) el.load();
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shot.video?.src]);

  return (
    <figure
      className={`relative m-0 overflow-hidden rounded-ad-lg border border-line ${
        hasMedia ? "aspect-[3/4] h-auto" : `h-[220px] lg:h-auto ${shot.tall ? "lg:row-span-2" : ""}`
      }`}
    >
      {shot.video ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={shot.video.poster}
          aria-label={shot.alt ?? shot.title}
          className="h-full w-full object-cover"
        >
          <source src={shot.video.src} type="video/mp4" />
        </video>
      ) : shot.photo ? (
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
  );
}
