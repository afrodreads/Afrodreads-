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

## Fase 3 — Inventário de Conteúdo (2026-09-28)

| Fonte | O que comprovou |
|---|---|
| `src/app/sitemap.ts` | Apenas 4 URLs públicas no sitemap (`/`, `/servicos`, `/portfolio`, `/contato`). |
| `src/app/` (todas as `page.tsx` e `route.ts`) | 31 rotas no total: 4 páginas públicas, ~8 patterns transacionais (agendamento, checkout, orçamento, admin) com `noindex`, 14 API routes, 1 llms.txt, 1 opengraph-image, 1 robots.ts, 1 sitemap.ts. |
| `src/app/servicos/page.tsx` | 9 serviços listados como âncoras (`id="slug"`) dentro de 1 única página, sem URL individual indexável. FAQ com 9 perguntas renderizado em `<details>/<summary>`. |
| `src/app/portfolio/page.tsx` | 3 casos de antes/depois + galeria com filtro. Conteúdo predominantemente visual, pouco texto descritivo. |
| `src/app/contato/page.tsx` | 3 canais (WhatsApp, Instagram, Google Maps) + formulário. Sem conteúdo informacional adicional. |
| `src/app/page.tsx` + `src/components/home/*.tsx` | Homepage com 7 seções: Hero, MarqueeBanner, MomentoRouter (3 jornadas), ServicesSection (carrossel), PortfolioPreview, LocationSection, ReviewsSection (5 depoimentos), FinalVideoCta. |
| `src/components/layout/Header.tsx` / `Footer.tsx` | Confirma que as 4 páginas públicas são linkadas no Header e Footer (sem páginas órfãs). |
| Grep por `metadata` em `src/app/` | Cada página pública tem title, description e canonical próprios. Páginas transacionais têm `robots: { index: false }`. |
| Contagem: 0 blog posts, 0 páginas de serviço individual, 0 About, 0 comparação, 0 glossário, 0 páginas locais | Superfície de conteúdo indexável extremamente pequena — maior gap identificado. |

Inventário completo em [`03-inventory.md`](./03-inventory.md).

## Fase 4 — Competitor Intelligence (2026-09-28)

| Fonte | O que comprovou |
|---|---|
| WebSearch: "dreadlocks são paulo" (2026-09-28) | Identificou Fresha (múltiplas páginas de bairro), Agulheria Dread SP (Facebook), Tranças e Dreads Galeria do Rock, dread.com.br/dreadmaker/ como resultados orgânicos. |
| WebSearch: "microlocs são paulo SP" (2026-09-28) | Resultados dominados por Instagram/YouTube; sem concorrente de conteúdo em pt-BR cobrindo microlocs. |
| WebSearch: "manutenção dreads são paulo" (2026-09-28) | Identificou Agulheria Dread SP, Arte Dreads, dread.com.br/dreadmaker/, Dread & Manutenção (Zona Leste). |
| WebSearch: "dreads pirituba zona norte SP" (2026-09-28) | Resultou em Fresha (Pirituba), Catia Dreads (Fresha), Agulheria Dread SP. Afro Dreads não apareceu. |
| WebSearch: "como fazer dreads dreadlocks passo a passo" (2026-09-28) | Identificou tudocommoda.com, elatoda.com.br, beleza.umcomo.com.br, allthingshair.com/br como concorrentes informacionais. |
| WebSearch: "retwist dreads São Paulo" (2026-09-28) | Resultou em Fresha, Agulheria Dread SP, Tranças e Dreads Galeria do Rock. |
| WebSearch: "melhor dreadlock São Paulo estúdio especializado" (2026-09-28) | Identificou Estúdio Baroni (estudiobaroni.com.br), dread.com.br/estudio-baroni/, Fresha como dominantes. |
| WebSearch: "locs são paulo estúdio salão agendar" (2026-09-28) | Fresha domina com múltiplas landing pages por bairro. Estúdio Baroni aparece via dread.com.br. |
| WebSearch: "revitalização de dreads como funciona" (2026-09-28) | Identificou fiquediva.com.br, manualdohomemmoderno.com.br, cabelospoderosos.com.br como concorrentes informacionais. |
| WebSearch: "cultivo agulhado dreadlocks o que é" (2026-09-28) | TikTok domina; stealthelook.com.br e todecacho.com.br aparecem. Nenhum conteúdo dedicado em pt-BR. |
| WebSearch: "start locs dreadlocks Brasil" (2026-09-28) | Resultados quase todos em inglês. Sem conteúdo relevante em pt-BR -- gap completo. |
| WebSearch: "dread danifica cabelo dreadlocks mitos" (2026-09-28) | ELLE Brasil, stealthelook.com.br, todecacho.com.br/mitos-e-verdades-sobre-os-dreads/, allthingshair.com/br. |
| WebSearch: "diferença entre dreads e tranças" (2026-09-28) | spiegato.com/pt, oque-e.com, auditorioibirapuera.com.br, YouTube. Nenhum concorrente direto. |
| WebSearch: "quanto custa fazer dreadlocks preço 2026" (2026-09-28) | TikTok, YouTube, sites em inglês. Nenhum conteúdo forte em pt-BR sobre preço. |
| WebSearch: "short dread cabelo curto dreadlocks" (2026-09-28) | TikTok domina completamente. Pinterest aparece. Sem conteúdo textual dedicado. |
| WebSearch: "microlocs o que é como funciona" (2026-09-28) | Resultados quase todos em inglês (styleseat.com, heymane.com, patternbeauty.com). Gap total em pt-BR. |
| WebSearch: site:dread.com.br dreadlocks (2026-09-28) | Identificou blog.dread.com.br/dread-matue-100-inspiracoes/, dread.com.br/categoria/cuidados-com-dread/, dread.com.br/dreads-removiveis/. |
| WebSearch: site:cabelospoderosos.com.br dreads (2026-09-28) | Identificou 9+ artigos sobre dreads incluindo cabelos curtos, finos/lisos, sintéticos vs naturais, cultura, manutenção. |
| WebSearch: todecacho.com.br guia definitivo dread (2026-09-28) | Identificou guia pilar /guia-definitivo-do-dread/, /dread-masculino/, /dread-de-la/, /penteados-com-dreads/, /mitos-e-verdades-sobre-os-dreads/. |
| WebSearch: elatoda.com.br OR tudocommoda.com dread (2026-09-28) | tudocommoda.com tem 6+ artigos: como-fazer-dreads, dread-feminino, dread-masculino, dread-de-la (2 versões). |
| WebSearch: fresha.com dreadlocks são paulo (2026-09-28) | Confirmou modelo programático por bairro: Cidade Dutra, Paraguai, Jardim Cotia, República, Parque São Lucas, etc. |
| WebFetch: estudiobaroni.com.br (2026-09-28) | Site single-page com 6 seções: História, Técnica, Vogue, Famosos, Valores (preços públicos), Agendar. WhatsApp +55 11 97794-1222. Galeria Ouro Fino, R. Augusta 2690. Preços: dread único R$40-70, cabeça inteira R$1.000-2.200, manutenção raiz R$300. |
| WebFetch: dread.com.br (2026-09-28) | Site em manutenção ("Perdoe nossa poeira! Estamos trabalhando em algo incrível"). Conteúdo não acessível, mas páginas internas ainda indexadas no Google. |
| WebFetch: cabelospoderosos.com.br/dreads/ (2026-09-28) | Hub de categoria com 75+ artigos sobre dreads em 9+ páginas de listagem, cobrindo técnicas, manutenção, estilo, cultura, cuidados. |
| WebFetch: cabelospoderosos.com.br/dreads/page/2/ (2026-09-28) | 75 artigos adicionais listados na página 2, muitos com sobreposição temática (múltiplos sobre "manter dreads saudáveis"). |
| WebFetch: todecacho.com.br/guia-definitivo-do-dread/ (2026-09-28) | Guia pilar com H2s: o que é dread, quem pode, tipos, como fazer, cabelo curto, colorido, lavagem, cuidados, penteados, acessórios, cortes, inspirações M/F. Links internos para box braids, black power. |
| WebFetch: fresha.com/lp/pt/tt/penteados-dreadlocks/br-sao-paulo/cidade-dutra (2026-09-28) | Página de listagem com 9 profissionais, breadcrumbs ricos, FAQ, 24+ bairros linkados, title otimizado "[serviço] perto de mim em [bairro]". |

Achados completos em [`04-competitors.md`](./04-competitors.md).

## Fase 7 — GEO / AI Search (2026-09-28)

Método: PROXY via busca web. 20+ buscas web em pt-BR como aproximação do pool de citação de IAs generativas (ChatGPT, Gemini, Perplexity, Google AI Overviews). Nenhuma consulta direta a sistemas de IA foi realizada.

| Fonte | O que comprovou |
|---|---|
| Busca web: "O que são dreadlocks" | Fontes dominantes: fiquediva.com.br, stealthelook.com.br, guiamake.com.br, allthingshair.com/br, Wikipedia. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Melhor estúdio de dreadlocks em São Paulo" | Fontes dominantes: fresha.com, dread.com.br, estudiobaroni.com.br. Concorrentes visíveis: Estúdio Baroni, Gaia Dreads, Agulheria Dread SP. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Microlocs o que é" | Quase exclusivamente fontes em inglês (heymane.com, styleseat.com, dreadextensions.com). Vazio quase total em pt-BR. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Onde fazer dreads em Pirituba São Paulo" | Fontes: fresha.com (listagens genéricas por bairro), Facebook. Nenhum estúdio específico de Pirituba retornado. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Dread danifica o cabelo" | Fontes: fiquediva.com.br, stealthelook.com.br, lunardreads.com.br, minhavida.com.br, YouTube. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Diferença entre dreads e tranças" | Fontes: spiegato.com/pt, oque-e.com, auditorioibirapuera.com.br, TikTok. Fontes de baixa autoridade no nicho. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Quanto custa fazer dreads em SP 2026" | Fonte principal: getninjas.com.br (dados de 2021). Informação desatualizada. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Manutenção de dreads como funciona retwist" | Dominado por fontes em inglês (dreadextensions.com, nakurulocksandbraiding.com). Vazio em pt-BR. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Melhor dreadlocker São Paulo" | Fontes: fresha.com, dread.com.br, gaiadreadsearts.com.br, rapresentando.com. Concorrentes: Baroni, Gaia. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Empresas especializadas em dreadlocks SP" | Fontes: fresha.com (dominante). Concorrentes: Agulheria, Lizafrica, Silvia's Hair Therapy. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Como escolher um estúdio de dreads" | Fontes: fiquediva.com.br, dread.com.br, todecacho.com.br, gaiadreadsearts.com.br/faq. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Microlocs vs dreads normais" | ZERO fontes em pt-BR. Apenas inglês (styleseat, heymane, dreadextensions, mylocksjourney). Afro Dreads NÃO citada como alternativa. |
| Busca web: "O que considerar ao fazer dreads pela primeira vez" | Fontes: todecacho.com.br, cidesp.com.br, allthingshair.com/br, cabelospoderosos.com.br. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Start locs o que é" | Apenas fontes em inglês (dreadlockpros.com, drlocs.com). ZERO em pt-BR. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Short dread masculino o que é" | Fontes: salonline.com.br, tudocommoda.com, allthingshair.com/br, cabeloafro.com.br. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Cultivo agulhado dreads dreadlocks" | ZERO páginas web — apenas TikTok e Facebook. Campo totalmente vazio para conteúdo web. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Revitalização de dreads São Paulo" | Fontes: facebook.com/agulheriadreadsp, dread.com.br, estudiobaroni.com.br. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Dreads em cabelo curto como fazer" | Fontes: TikTok, cabelospoderosos.com.br, allthingshair.com/br, elatoda.com.br. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Como cuidar de dreads novos primeiras semanas" | Fontes: fiquediva.com.br, manualdohomemmoderno.com.br, blog.mensmarket.com.br, prohall.com.br. Afro Dreads: NAO ENCONTRADA. |
| Busca web: "Quem faz dreads em São Paulo" | Fontes: fresha.com, getninjas.com.br, dread.com.br. Concorrentes: Baroni, Agulheria, Gaia, Zion Malik. Afro Dreads: NAO ENCONTRADA. |
| Busca web: `"afrodreads" OR "afro dreads" dreadlocks pirituba` | Única presença encontrada: Instagram @afrodreads_ (15K seguidores). Site afrodreads.com.br NÃO retornado nos resultados orgânicos. |
| Busca web: `site:afrodreads.com.br` | Domínio NÃO indexado nos resultados de busca. Retornou apenas PRs do GitHub e perfil do Instagram. |
| Busca web: "Estúdio Baroni alternativas concorrentes" | Apenas info sobre o próprio Baroni (site, Fresha, Instagram, Facebook, dread.com.br). Afro Dreads NÃO citada como alternativa. |

Análise GEO completa em [`07-geo.md`](./07-geo.md). Planilha de testes manuais em [`geo-prompt-tests.md`](./geo-prompt-tests.md).

## Fases 5-6 -- Keywords + SERP (2026-09-28)

Metodo: 30+ buscas web em pt-BR cobrindo head terms, mid-tail, long-tail, perguntas, keywords comerciais, transacionais, informacionais, locais, de comparacao e de objecao. Analise SERP detalhada (fetch de paginas ranqueadas) para as 15 keywords mais importantes.

| Fonte | O que comprovou |
|---|---|
| WebSearch: "dreads em pirituba sp" | SERP local: Fresha (Jardim Pirituba), Catia Dreads (Fresha), Agulheria Dread SP (Instagram/Facebook). Nenhum site proprio otimizado para Pirituba. |
| WebSearch: "dreadlocks sao paulo agendar" | Fresha domina diretorios; Estudio Baroni unico site proprio; Instagram/Facebook de estudios. |
| WebSearch: "quanto custa fazer dreads 2026" | GetNinjas (R$100-R$1000), YouTube, Facebook. Dados conflitantes (stealthelook diz R$1.300-R$12.000). |
| WebSearch: "microlocs o que e" | Instagram pt-BR, TikTok em ingles, artigos em ingles (whatnaturalslove, heymane). ZERO guias completos em pt-BR. |
| WebSearch: "diferenca entre dreads e trancas" | Sites de Q&A genericos (spiegato, oque-e.com, auditorioibirapuera). Conteudo raso, sem autoridade profissional. |
| WebSearch: "dread danifica o cabelo" | Portais de beleza (fiquediva, stealthelook, dread.com.br, cabelospoderosos, minhavida). Nenhum dreadlocker profissional responde. |
| WebSearch: "retwist dreads manutencao" | YouTube e TikTok dominam. Poucos artigos escritos em pt-BR. |
| WebSearch: "melhor dreadlocker sao paulo" | Fresha, dread.com.br/dreadmaker/ (404), Estudio Baroni. SERP fragmentada. |
| WebSearch: "como fazer dreads no cabelo" | YouTube, tudocommoda, todecacho, comofazerfacil, capila.com.br. Guias editoriais dominam. |
| WebSearch: "dreads para cabelo curto" | TikTok domina completamente. Conteudo escrito quase inexistente. |
| WebSearch: "microlocs vs dreads diferenca" | 100% resultados em ingles (heymane, whatnaturalslove, mylocksjourney). ZERO em pt-BR. |
| WebSearch: "short dread masculino" | TikTok, Pinterest, blogs de moda (salonline, cabeloafro.com.br, allthingshair). |
| WebSearch: "cultivo agulhado dreadlocks o que e" | TikTok domina; artedreads.com (info basica), stealthelook (mencao breve). ZERO guia completo. |
| WebSearch: "start locs dreads o que e" | Resultados em ingles; TikTok. Nenhum guia em pt-BR. |
| WebSearch: "revitalizacao de dreads como funciona" | fiquediva, manualdohomemmoderno, cabelospoderosos. Conteudo generico, mistura cuidados caseiros com servico profissional. |
| WebSearch: "dreads perto de mim zona norte sao paulo" | Fresha (Jardim Brasil - Zona Norte). Nenhum site proprio. |
| WebSearch: "dread feminino tipos inspiracoes 2026" | elatoda, marciatravessoni, tudocommoda, salonline, cortedecabelofeminino. 6+ portais editoriais. |
| WebSearch: "dread preco tabela valores" | GetNinjas, artedreads.com, Amazon.br, Shopee. Mistura servico e produto. |
| WebSearch: "como cuidar de dreads lavagem manutencao" | Boticario, fiquediva, blog.mensmarket, usebob, kert, prohall, saudelab. Marcas de cosmeticos dominam. |
| WebSearch: "penteados para dreads" | TikTok, Pinterest, todecacho, belaefeliz. Conteudo visual fragmentado. |
| WebSearch: "dreadmaker SP profissional" | Fresha, dread.com.br/dreadmaker/, Instagram @omdreads, @agulheriadreadsp. |
| WebSearch: "microdreads cabelo" | Etsy (produtos sinteticos), TikTok. Nenhum resultado pt-BR relevante. |
| WebSearch: "quanto tempo dura fazer dreads sessao" | YouTube Shorts e TikTok dominam. ZERO conteudo escrito. |
| WebSearch: "dread natural vs sintetico" | YouTube, uai.com.br (2015), cabelospoderosos, antoniettasp. Conteudo antigo. |
| WebSearch: "dread masculino fotos estilos 2026" | TikTok, Pinterest, accio.com. Galerias visuais. |
| WebSearch: "locs cabelo crespo natural como comecar" | TikTok em massa. allthingshair mencionado. |
| WebSearch: "manutencao de dreads sp agendar retwist" | YouTube, TikTok, Instagram de profissionais. Nenhum site proprio. |
| WebSearch: "dread estudio pirituba zona noroeste sp" | Confirma Pirituba como zona noroeste (admin zona norte). Nenhum estudio de dreads especifico encontrado em Pirituba via organico. |
| WebSearch: "dread cabelo liso funciona" | TikTok domina. Arte Dreads (Tumblr) confirma que e possivel. |
| WebSearch: "como lavar dreads corretamente" | Boticario, blog.mensmarket, Prohall, fiquediva, YouTube. Guias de marcas de cosmeticos. |
| WebSearch: "dreads tipos diferentes estilos guia completo" | stealthelook, elatoda, todecacho, guiamake, sempaleto, salaovirtual, allthingshair, minhavida. Guias longos de portais editoriais. |
| WebSearch: "fazer dreads sp preco agendar" | GetNinjas, Agulheria Dread SP, dread.com.br, Estudio Baroni, Studio Dread SP, artedreads.com. |
| WebSearch: "dreads antes e depois transformacao" | TikTok, Flickr (artedreads), fiquediva, stealthelook, dicasdemulher, Pinterest. |
| WebSearch: "alopecia tracao dreads cuidados prevenir" | Clinicas dermatologicas: loreal-paris, clinicadoppio, dermatobrasilia, jakbell. Nenhum dreadlocker. |
| WebSearch: "dreads removiveis vale a pena" | dread.com.br, lojayakira, Pinterest, TikTok, allthingshair, minhavida. |
| WebSearch: "dread de agulha crochet passo a passo" | YouTube (tutoriais), TikTok, zhanghair (venda de agulha). |
| WebSearch: "primeira aplicacao dreads o que saber" | fiquediva, blog.kert, elatoda, omdreads.webnode, cidesp, allthingshair. |
| WebSearch: "salon de dreads avaliacao google maps sao paulo" | Resultados genericos: Fresha, Google Maps help. Nenhum ranking especifico. |
| WebSearch: "interlock dreads tecnica o que e" | Resultados 100% em ingles. ZERO conteudo em pt-BR sobre interlock. |
| WebSearch: "cabelo com dread cuidados produtos" | Boticario, fiquediva, usebob, kert, allthingshair, antoniettasp. Marcas de cosmeticos dominam. |
| WebSearch: "dreadlocks zona noroeste sp pirituba jaragua" | Fresha (Jaragua, Piqueri), Wikipedia (Pirituba, Subprefeitura Pirituba-Jaragua). Nenhum estudio especifico. |
| WebFetch: getninjas.com.br/...fazer-dread | Estrutura: titulo "Quanto custa fazer dread?", faixa R$100-R$1000, 5 tipos de dread, fatores de preco, cuidados pos-aplicacao. |
| WebFetch: todecacho.com.br/guia-definitivo-do-dread/ | Guia pilar 2000+ palavras. H2s: o que e dread, tipos, como fazer, cabelo curto, colorido, lavagem, cuidados, penteados, acessorios, cortes, inspiracoes. Links internos para box braids, black power. |
| WebFetch: stealthelook.com.br/dread-tudo-que-voce-precisa-saber/ | Guia completo com tipos, precos (R$1.300-R$12.000), cuidados, remocao. Cita Lucas Preto (Africarioca), celebridades. |
| WebFetch: cabelospoderosos.com.br/processo-fazer-dreads/ | Artigo abrangente com FAQ de 15 perguntas, glossario de 18 termos, tabela mitos vs verdades. Blog geral de cabelo, nao especializado. |
| WebFetch: estudiobaroni.com.br | Concorrente direto. Site single-page: historia, tecnica, Vogue, famosos, precos publicos (R$40-70 unitario, R$1.000-2.200 cabeca toda, R$300 manutencao). Vila Madalena/R. Augusta. |

Resultados completos em [`05-keywords.md`](./05-keywords.md) e [`06-serp.md`](./06-serp.md).

## Fases 8–18 — Síntese (2026-09-29)

Fases feitas pelo orquestrador, sem novas buscas na web; usam apenas os arquivos já registrados acima e o código-fonte.

| Fonte | O que comprovou / como foi usada |
|---|---|
| `08-entities.md` ← `01`, `02`, `03`, `07`, `src/lib/seo.ts`, `src/lib/services.ts`, `src/app/llms.txt/route.ts` | Mapa de entidades; ausência de Lyon/Thay no site; handles diferentes (`@afrodreads_` × `@afrodreadsofc`); horário/telefone do código |
| `09-local.md` ← `04`, `05`, `06`, `07` | Concorrência local (Fresha, Baroni, Agulheria); hiperlocal quase vazio; regras de não criar páginas por bairro |
| `10-clusters.md`, `11-architecture.md` ← `05`, `06`, `07` | 6 clusters, arquitetura de URLs e plano de conteúdo com 28 itens |
| `briefs/*.md` (8) | Briefs das peças de prioridade ALTA; campos que dependem do dono marcados |
| `13-internal-linking.md`, `14-structured-data.md`, `15-priorities.md`, `17-roadmap.md` | Plano de links, schema (JSON-LD de exemplo com o texto real do FAQ do site), priorização ALTA/MÉDIA/BAIXA, roadmap de 90 dias |
| `FINAL-STRATEGY.md` | Entrega final (22 seções) + checklist de QC |
| E-mails do Google Search Console enviados ao dono (imagens recebidas na sessão) | Coleta de impressões iniciada em 26/09/2026 para o site e para o perfil do Instagram @afrodreads_ |

**Divergência registrada no QC:** endereço do Estúdio Baroni diferente entre `04-competitors.md` (R. Augusta 2690) e `07-geo.md` (R. Aspicuelta 300). Não usado na estratégia.
