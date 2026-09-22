import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://afrodreads.com.br";

// Só as páginas públicas de conteúdo — checkout, orçamento e admin são
// transacionais/privadas e ficam de fora (ver robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/portfolio"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
