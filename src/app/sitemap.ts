import type { MetadataRoute } from "next";

import { GUIDES } from "@/lib/guides";
import { SERVICES } from "@/lib/services";
import { CANONICAL_URL as SITE_URL } from "@/lib/site";

// Só as páginas públicas de conteúdo — checkout, orçamento e admin são
// transacionais/privadas e ficam de fora (ver robots.ts).
// Atualize esta data quando o conteúdo das páginas públicas mudar. Usar
// new Date() faria toda página parecer alterada a cada build.
const LAST_MODIFIED = new Date("2026-09-29");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/servicos",
    ...SERVICES.map((s) => `/servicos/${s.slug}`),
    "/guias",
    ...GUIDES.map((g) => `/guias/${g.slug}`),
    "/portfolio",
    "/contato",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : route.startsWith("/servicos/") ? 0.7 : 0.8,
  }));
}
