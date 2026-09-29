import type { MetadataRoute } from "next";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

// Só as páginas públicas de conteúdo — checkout, orçamento e admin são
// transacionais/privadas e ficam de fora (ver robots.ts).
// Atualize esta data quando o conteúdo das páginas públicas mudar. Usar
// new Date() faria toda página parecer alterada a cada build.
const LAST_MODIFIED = new Date("2026-09-29");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/servicos", "/portfolio", "/contato"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
