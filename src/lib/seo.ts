import { WHATSAPP_LINK } from "@/lib/contact";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://afrodreads.com.br";

// Dados estruturados (schema.org) do negócio, injetados como JSON-LD no
// layout raiz. Endereço mantido só em nível de bairro/cidade — o mesmo
// nível de detalhe já exposto publicamente pelo site (o endereço completo
// só é enviado por WhatsApp após a confirmação do agendamento).
export const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "Afro Dreads",
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
