import type { MetadataRoute } from "next";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

// Só as páginas públicas de conteúdo — checkout, orçamento e admin são
// transacionais/privadas e ficam de fora (ver robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/servicos", "/portfolio", "/contato"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
