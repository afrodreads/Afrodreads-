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
};

const PLACEHOLDER_VARIANTS = ["default", "alt", "sun"] as const;

export function ServiceListRow({ service, index }: { service: ServiceDefinition; index: number }) {
  const intent = INTENT_BY_SLUG[service.slug] ?? "geral";

  return (
    <article
      id={service.slug}
      className="grid grid-cols-1 items-center gap-4 rounded-ad-lg border border-line bg-surface-raised p-4 sm:grid-cols-[200px_1fr_auto] sm:gap-8 sm:pr-8"
    >
      <div className="h-[200px] overflow-hidden rounded-ad-md">
        <PhotoPlaceholder variant={PLACEHOLDER_VARIANTS[index % PLACEHOLDER_VARIANTS.length]} />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="m-0 font-serif text-4xl font-normal uppercase leading-none tracking-tight text-ink">
          {service.name}
        </h3>
        <p className="m-0 max-w-lg text-[15px] leading-relaxed text-ink-muted">{service.description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <AdTag>Duração: {service.minHours}h – {service.maxHours}h</AdTag>
        </div>
      </div>
      <div className="flex flex-row items-baseline gap-3 sm:flex-col sm:items-end sm:gap-1">
        <AdButton href={buildWhatsAppLink(intent)} icon={<WhatsAppIcon className="h-4 w-4" />}>
          Agendar
        </AdButton>
      </div>
    </article>
  );
}
