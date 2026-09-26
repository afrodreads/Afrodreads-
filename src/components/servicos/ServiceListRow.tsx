"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { AdTag } from "@/components/ui/Tag";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink, type WhatsAppMessageKey } from "@/lib/whatsapp";
import type { ServiceDefinition } from "@/lib/services";

const INTENT_BY_SLUG: Record<string, WhatsAppMessageKey> = {
  "primeira-aplicacao-topo": "primeira",
  "cabeca-toda": "primeira",
  microlocs: "primeira",
  retwist: "manutencao",
  "retwist-twist": "manutencao",
  revitalizacao: "revitalizacao",
  penteados: "geral",
  "short-dread": "primeira",
  "cultivo-agulhado": "primeira",
};

const PLACEHOLDER_VARIANTS = ["default", "alt", "sun"] as const;

export type ServiceVideo = { src: string; poster: string };

export function ServiceListRow({
  service,
  index,
  video,
  active,
}: {
  service: ServiceDefinition;
  index: number;
  video?: ServiceVideo;
  // Controlado pelo carrossel (so o card ativo toca). Sem essa prop (lista
  // vertical), cada card toca/pausa sozinho conforme aparece na tela.
  active?: boolean;
}) {
  const intent = INTENT_BY_SLUG[service.slug] ?? "geral";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const shouldPlay = active ?? visible;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || active !== undefined) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (shouldPlay) {
      if (el.readyState === 0) el.load();
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [shouldPlay]);

  return (
    <article
      id={service.slug}
      className="flex h-full w-full flex-col overflow-hidden rounded-ad-lg border border-line bg-surface-raised"
    >
      <div className="w-full overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
        {video ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            poster={video.poster}
            aria-label={service.name}
            onClick={(e) => {
              const el = e.currentTarget;
              if (el.readyState === 0) el.load();
              el.play().catch(() => {});
            }}
            className="h-full w-full cursor-pointer object-cover"
          >
            <source src={video.src} type="video/mp4" />
          </video>
        ) : (
          <PhotoPlaceholder variant={PLACEHOLDER_VARIANTS[index % PLACEHOLDER_VARIANTS.length]} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="m-0 font-serif text-3xl font-normal uppercase leading-none tracking-tight text-ink">
          {service.name}
        </h3>
        <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{service.description}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <AdTag>Duração: {service.minHours}h – {service.maxHours}h</AdTag>
        </div>
        <AdButton
          href={buildWhatsAppLink(intent)}
          icon={<WhatsAppIcon className="h-4 w-4" />}
          className="mt-auto self-start"
        >
          Agendar
        </AdButton>
      </div>
    </article>
  );
}
