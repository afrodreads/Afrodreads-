import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://afrodreads.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/checkout", "/orcamento", "/agendamento", "/agendamento/*/sucesso", "/agendamento/*/pendente", "/agendamento/*/erro"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
