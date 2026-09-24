"use client";

import { useEffect, useRef } from "react";
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
};

const PLACEHOLDER_VARIANTS = ["default", "alt", "sun"] as const;

export type ServiceVideo = { src: string; poster: string };

export function ServiceListRow({
  service,
  index,
  video,
}: {
  service: ServiceDefinition;
  index: number;
  video?: ServiceVideo;
}) {
  const intent = INTENT_BY_SLUG[service.slug] ?? "geral";
  const videoRef = useRef<HTMLVideoElement>(null);

  // So carrega/toca o video quando o card entra na tela, e pausa quando sai.
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
  }, []);

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
            className="h-full w-full object-cover"
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
