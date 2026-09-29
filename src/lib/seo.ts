import type { FaqItem } from "@/components/ui/FaqAccordion";
import { SERVICES } from "@/lib/services";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

// Perfil da Afro Dreads no Google Maps (link estável pelo CID do lugar).
const GOOGLE_MAPS_PROFILE = "https://www.google.com/maps?cid=16389951172798541889";

// Dados estruturados (schema.org) do negócio, injetados como JSON-LD no
// layout raiz. Endereço mantido só em nível de bairro/cidade — o mesmo
// nível de detalhe já exposto publicamente pelo site (o endereço completo
// só é enviado por WhatsApp após a confirmação do agendamento).
export const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "Afro Dreads",
  description:
    "Estúdio especializado em dreadlocks e microlocs em Pirituba, São Paulo - SP: formação, manutenção, revitalização e penteados, com hora marcada.",
  url: SITE_URL,
  image: [`${SITE_URL}/og-image.png`, `${SITE_URL}/icon.png`],
  logo: `${SITE_URL}/icon.png`,
  email: "afrodreadsofc@gmail.com",
  telephone: "+55 11 91538-8113",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Pirituba, São Paulo",
    addressRegion: "SP",
    addressCountry: "BR",
  },
  areaServed: "São Paulo, SP",
  // Coordenadas arredondadas (~1 km, nível de bairro) de propósito, para não
  // expor o ponto exato; o endereço completo só é enviado após o agendamento.
  geo: { "@type": "GeoCoordinates", latitude: -23.49, longitude: -46.73 },
  hasMap: GOOGLE_MAPS_PROFILE,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços de dreadlocks e microlocs",
    itemListElement: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        url: `${SITE_URL}/servicos/${service.slug}`,
      },
    })),
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "10:00",
    closes: "18:00",
  },
  sameAs: [
    GOOGLE_MAPS_PROFILE,
    "https://instagram.com/afrodreads_",
    "https://tiktok.com/@afrodreads_",
    "https://youtube.com/@afrodreadsofc",
  ],
};

// FAQPage: as mesmas perguntas visíveis em /servicos, marcadas para o Google e IAs.
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(
  name: string,
  path: string,
  parents: { name: string; path: string }[] = [],
) {
  const trail = [{ name: "Início", path: "/" }, ...parents, { name, path }];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${SITE_URL}${step.path}`,
    })),
  };
}

export function serviceJsonLd(service: { slug: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: `${SITE_URL}/servicos/${service.slug}`,
    serviceType: "Dreadlocks e microlocs",
    areaServed: "São Paulo, SP",
    provider: { "@type": "HairSalon", name: "Afro Dreads", url: SITE_URL },
  };
}
