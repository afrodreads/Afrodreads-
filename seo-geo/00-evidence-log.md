# Log de evidências

Registro de toda URL/arquivo consultado durante a engine SEO + GEO, e o que cada um comprovou.

## Fase 1 — Business Intelligence (2026-09-26)

| Fonte | O que comprovou |
|---|---|
| `.claude/skills/seo-geo-engine/references/business-context.md` | Fatos fornecidos pelo dono (INFORMADO PELO CLIENTE): localização, fundadores, serviços "oficiais", política de preço, funil, objeções recorrentes. |
| `src/app/layout.tsx` | Title/description globais, JSON-LD injetado, idioma `pt-BR`, domínio canônico. |
| `src/lib/seo.ts` | `businessJsonLd`: tipo `HairSalon`, endereço (bairro/cidade), telefone, e-mail, `priceRange: "$$"`, catálogo de serviços, horário de funcionamento, `sameAs` (WhatsApp/Instagram/TikTok/YouTube), `aggregateRating` (5.0 / 56 avaliações) — valores fixos no código, não buscados em tempo real. |
| `src/lib/site.ts` | `CANONICAL_URL = https://www.afrodreads.com.br` (domínio oficial para SEO; `afrodreads.vercel.app` é usado só internamente pelo pagamento). |
| `src/lib/services.ts` | Lista oficial de 9 serviços com slug, nome, duração (min/max horas) e descrição — fonte única usada no site, no seed do banco e no cálculo de agenda. |
| `prisma/schema.prisma` | Modelo de dados real: `Service`, `Booking` (com `isOutOfTownSeason`), `Payment` (PIX/cartão/boleto via Mercado Pago), `Quote` (token, expiração) — confirma que o preço final é definido em orçamento individual e o pagamento (sinal) acontece online depois que o valor é combinado, não que o site "não vende online". |
| `src/app/servicos/page.tsx` | Copy real da página de Serviços, FAQ (9 perguntas), regras de sinal/cancelamento, confirma "não fazemos tranças", confirma que preço "é combinado direto por WhatsApp". |
| `src/app/contato/page.tsx` | Canais de contato reais: WhatsApp, Instagram (@afrodreads_), Google (link de avaliações). Confirma que endereço completo só é enviado após agendamento confirmado. |
| `src/app/portfolio/page.tsx` | Confirma "antes/depois" reais, depoimentos do Google reproduzidos no site. |
| `src/lib/testimonials.ts` | 5 depoimentos reais extraídos do Google Maps (nota interna no código: "Afro Dreads, 5,0 ⭐ · 56 avaliações"). |
| `src/lib/contact.ts` | Link oficial do WhatsApp (`wa.me/message/WFY4THHQSOITF1`). |
| `src/app/page.tsx` + componentes de Home | Estrutura real da home: Hero, marquee, roteador "qual é o seu momento" (primeira vez / manutenção / revitalização), serviços, portfólio, localização, avaliações, CTA final. |
| `https://www.afrodreads.com.br/` (fetch ao vivo, texto renderizado) | Confirma que o conteúdo acima está de fato publicado em produção e é idêntico ao código-fonte (título, textos, 9 serviços, "5,0 ⭐ · 56 avaliações", depoimentos, CTAs). |

Todas as fontes acima também servem de evidência para a Fase 2 (auditoria técnica), que roda em paralelo/sequência via subagente `seo-technical-auditor`.

## Fase 2 — Auditoria Técnica (2026-09-26)

| Fonte | O que comprovou |
|---|---|
| `src/lib/seo.ts` | Bloco único `businessJsonLd` (`HairSalon`); `aggregateRating` fixo (`ratingValue: "5.0"`, `reviewCount: "56"`) sem mecanismo de atualização; `image` aponta para `/icon.png` (logo), não para foto real. |
| `src/app/layout.tsx` | Único ponto de injeção de JSON-LD (`<script type="application/ld+json">`) para todo o site; importa e aplica 5 famílias de fonte (Anton, Inter, Instrument Serif, DM Sans, DM Mono) via `next/font/google` na `<body>` do layout raiz, compartilhado por todas as rotas. |
| `src/app/robots.ts` | Regras geradas: `Allow: /` + `Disallow` de `/admin`, `/api`, `/checkout`, `/orcamento`, `/agendamento` para `*` e para 11 user-agents nomeados (Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, ClaudeBot, Google-Extended); referencia `sitemap.xml`. |
| `src/app/sitemap.ts` | Apenas 4 rotas públicas (`""`, `/servicos`, `/portfolio`, `/contato`); `lastModified: new Date()` (sempre a data do build, não da mudança real de conteúdo). |
| `src/app/llms.txt/route.ts` | Rota `force-static` que expõe resumo do negócio, serviços (gerados a partir de `SERVICES`, fonte única) e links para as páginas públicas, em texto plano, para bots de IA. |
| `src/app/page.tsx` + `src/components/home/*.tsx` (Hero, MarqueeBanner, MomentoRouter, ServicesSection, LocationSection, ReviewsSection, FinalVideoCta) | Confirma H1 único na Hero (`as="h1"`); vídeo do Hero com autoplay via JS e `preload="auto"` (~226 KB); demais vídeos (`FinalVideoCta`) usam `preload="none"` + `IntersectionObserver`; nenhuma marcação de schema adicional nesses componentes. |
| `src/app/servicos/page.tsx` | `metadata` com title/description/canonical próprios; array `FAQ_ITEMS` com 9 perguntas reais; nenhuma marcação `FAQPage` associada. |
| `src/app/portfolio/page.tsx` | `metadata` com title/description/canonical próprios; casos de antes/depois e depoimentos reais. |
| `src/app/contato/page.tsx` | `metadata` com title/description/canonical próprios; confirma que o endereço completo não é publicado (apenas "Pirituba · São Paulo"). |
| `src/app/opengraph-image.tsx` | Geração dinâmica de imagem OG 1200×630 via `next/og`. |
| `src/components/servicos/ServiceCarouselList.tsx` | Vídeos por serviço carregados só quando o carrossel está visível (`IntersectionObserver`, `inView`). |
| `src/components/portfolio/GalleryFilter.tsx` | Grade de fotos/vídeos do portfólio com `loading="lazy"` (fotos) e `preload="none"` + `IntersectionObserver` por card de vídeo. |
| `src/components/portfolio/BeforeAfterSlider.tsx` | Confirma `alt` distinto para as imagens de "antes" e "depois". |
| `src/components/ui/FaqAccordion.tsx` | Confirma uso de `<details>`/`<summary>` nativos (conteúdo do FAQ presente no HTML mesmo sem JS). |
| `src/components/ui/SafeImage.tsx` | Fallback para `PhotoPlaceholder` quando uma imagem listada no código ainda não existe em `public/`. |
| `src/components/layout/Header.tsx` / `Footer.tsx` | Logo com `width`/`height` explícitos e `priority` (sem CLS); links internos consistentes para as 4 páginas públicas. |
| `tailwind.config.ts` | Mapeamento `fontFamily`: `body` (Inter, padrão herdado por todo texto via `<body>`), `serif`/`sans`/`mono` (Instrument Serif/DM Sans/DM Mono, usados pelos componentes de marketing), `display` (Anton). |
| `next.config.mjs` | Confirma ausência de função `headers()` customizada — o cache `max-age=0, must-revalidate` dos assets de `public/` é o comportamento padrão do projeto, não uma configuração deliberada. |
| `grep -rn "schema.org\|application/ld+json\|FAQPage\|BreadcrumbList" src/` | Confirma que existe apenas 1 bloco JSON-LD em todo o repositório (`HairSalon`), sem `FAQPage` nem `BreadcrumbList`. |
| `grep -rl "font-display" src/` | Confirma que a fonte Anton só é usada em páginas de admin/checkout/agendamento (9 arquivos), nunca nas páginas públicas de marketing. |
| `ls -la public/*.mp4 public/*.jpg` | Tamanhos reais dos vídeos (~220 KB a ~890 KB) e imagens (~15 KB a ~320 KB) usados no site. |
| `curl https://www.afrodreads.com.br/` (HTML bruto) | Title, canonical (`/`), H1 único, JSON-LD único (com `aggregateRating` idêntico ao código), Open Graph/Twitter completos, meta viewport, favicon único de 841×841. |
| `curl https://www.afrodreads.com.br/robots.txt` | Conteúdo ao vivo idêntico ao gerado por `robots.ts`. |
| `curl https://www.afrodreads.com.br/sitemap.xml` | XML válido; `lastmod` idêntico (data do último build) nas 4 URLs. |
| `curl https://www.afrodreads.com.br/servicos` (HTML bruto) | Title, canonical (`/servicos`), H1, texto das 9 perguntas do FAQ presente no HTML (SSR), 9 tags `<details>`, ausência da string `FAQPage`, 9 `id`s de âncora de serviço (incluindo `id="retwist-twist"` para o serviço exibido como "Start Locs"). |
| `curl https://www.afrodreads.com.br/portfolio` (HTML bruto) | Title, H1. |
| `curl https://www.afrodreads.com.br/contato` (HTML bruto) | Title, canonical (`/contato`), H1. |
| `curl https://www.afrodreads.com.br/llms.txt` | Conteúdo ao vivo idêntico ao gerado pela rota, incluindo o mesmo texto de avaliação "5,0 (56 avaliações)". |
| `curl -I https://www.afrodreads.com.br/hero.mp4` | `Cache-Control: public, max-age=0, must-revalidate` em asset estático de `public/`. |
| `curl -sD ... -H "Accept-Encoding: gzip, br" https://www.afrodreads.com.br/servicos` | Confirma `Content-Encoding: br` (Brotli ativo; 79 KB → ~11,6 KB). |
| `curl -sI https://afrodreads.com.br/` | Redirect 308 para `https://www.afrodreads.com.br/` (apex → www). |
| `curl -sI http://www.afrodreads.com.br/` | Redirect 308 para `https://www.afrodreads.com.br/` (http → https). |
| `curl -sI https://www.afrodreads.com.br/servicos/` | Redirect 308 para `/servicos` (sem barra final). |
| `curl https://www.afrodreads.com.br/icon.png?...` | Confirma 97.385 bytes reais baixados para o favicon único de 841×841, sem `apple-touch-icon` nem `manifest.json` no HTML. |

Achados completos com formato ISSUE/EVIDENCE/TYPE/SEO IMPACT/GEO IMPACT/SEVERITY/RECOMMENDED ACTION em [`02-technical.md`](./02-technical.md).
