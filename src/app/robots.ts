import type { MetadataRoute } from "next";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

// Areas transacionais/privadas: ficam fora para todos os robos.
const PRIVATE_PATHS = ["/admin", "/api", "/checkout", "/orcamento", "/agendamento"];

// Robos de busca e de IA liberados explicitamente (alem do "*"), para o site
// poder aparecer e ser citado em ChatGPT, Perplexity, Claude e Gemini.
const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE_PATHS })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
