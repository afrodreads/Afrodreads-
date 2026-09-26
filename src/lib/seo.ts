import { WHATSAPP_LINK } from "@/lib/contact";
import { SERVICES } from "@/lib/services";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

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
  image: `${SITE_URL}/icon.png`,
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
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços de dreadlocks e microlocs",
    itemListElement: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        url: `${SITE_URL}/servicos#${service.slug}`,
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
    WHATSAPP_LINK,
    "https://instagram.com/afrodreads_",
    "https://tiktok.com/@afrodreads_",
    "https://youtube.com/@afrodreadsofc",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "56",
  },
};
