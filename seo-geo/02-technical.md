# Fase 2 — Auditoria Técnica de SEO (Agente 2)

Site analisado: https://www.afrodreads.com.br/
Fontes: código-fonte do repositório (`src/app`, `src/lib`, `src/components`, `public/`) + requisições ao vivo (HTML bruto, headers HTTP, robots.txt, sitemap.xml, llms.txt). Ver detalhamento completo em [`00-evidence-log.md`](./00-evidence-log.md), seção "Fase 2".

Legenda: **FATO VERIFICADO** (com URL/arquivo) · **INFERÊNCIA** (sem métrica real, precisa de confirmação com ferramenta própria) · **RECOMENDAÇÃO**.

Nenhum problema encontrado nesta fase foi classificado como **CRITICAL** — o site está indexável, servido em HTTPS, sem bloqueios acidentais de robôs e sem erros de renderização que escondam conteúdo dos crawlers. Os problemas abaixo são de **HIGH** a **LOW**, em sua maioria oportunidades de marcação/performance, não bloqueios de indexação.

---

## HIGH

### 1. `aggregateRating` fixo no JSON-LD sem mecanismo de atualização
**ISSUE:** O JSON-LD `HairSalon` injetado em toda página do site declara `aggregateRating: { ratingValue: "5.0", reviewCount: "56" }` como valor literal no código-fonte, não como dado buscado em tempo real do Google Business Profile.
**EVIDENCE:** `src/lib/seo.ts:53-57`; confirmado ao vivo no `<script type="application/ld+json">` de `https://www.afrodreads.com.br/` (mesmo valor `"ratingValue":"5.0","reviewCount":"56"`); reforçado por comentário em `src/lib/testimonials.ts` ("Afro Dreads, 5,0 ⭐ · 56 avaliações") e repetido também em `src/app/llms.txt/route.ts` ("Avaliação no Google: 5,0 (56 avaliações)"). Hoje o valor é real (confirmado na Fase 1), mas não há nenhum job/CRON/API que sincronize esse número com o Google Meu Negócio.
**TYPE:** Dados estruturados (schema.org) / manutenção de conteúdo.
**SEO IMPACT:** As diretrizes do Google para "Review snippet" exigem que o `aggregateRating` reflita avaliações genuínas e atuais da entidade. Assim que a nota ou o número de avaliações mudar no Google (o que é esperado com o tempo), o schema do site ficará desatualizado/incorreto sem que ninguém perceba, o que é tratado pelo Google como marcação enganosa e pode levar à supressão do rich result ou, em casos recorrentes, a ação manual.
**GEO IMPACT:** Assistentes de IA que citam esse JSON-LD (ou o `llms.txt`, que replica o mesmo número em texto) podem repetir uma avaliação desatualizada como se fosse atual, criando uma citação factualmente incorreta atribuída ao negócio.
**SEVERITY:** HIGH
**RECOMMENDED ACTION:** Definir um processo de revisão manual periódica (ex.: mensal) do valor de `ratingValue`/`reviewCount` em `src/lib/seo.ts` e do texto equivalente em `llms.txt`/`testimonials.ts`; ou, melhor, buscar o dado da API do Google Business Profile / Places API em build-time e injetar dinamicamente, eliminando o valor hardcoded. Não remover o `aggregateRating` sem antes avaliar o impacto no rich result atual, mas não deixá-lo sem dono/processo de atualização.

### 2. FAQ real na página de Serviços sem marcação `FAQPage`
**ISSUE:** A página `/servicos` tem um acordeão com 9 perguntas e respostas reais (dúvidas de clientes: dano ao cabelo, cor, cabelo curto, manutenção, preço, duração, localização, tranças, como escolher o procedimento), renderizado no HTML antes do JavaScript rodar — mas não existe nenhum JSON-LD do tipo `FAQPage` associado a esse conteúdo.
**EVIDENCE:** `src/app/servicos/page.tsx:18-60` (array `FAQ_ITEMS` com as 9 perguntas); `src/components/ui/FaqAccordion.tsx` (usa `<details>`/`<summary>` nativos); `grep -r "FAQPage" src/` não retornou nenhuma ocorrência em todo o repositório; confirmado ao vivo — `curl https://www.afrodreads.com.br/servicos` traz o texto "Dread danifica o cabelo" e 9 tags `<details>` no HTML bruto, mas nenhuma ocorrência da string `FAQPage` na página.
**TYPE:** Dados estruturados (schema.org) ausentes / rich results.
**SEO IMPACT:** Sem `FAQPage`, o Google não pode exibir o rich result de perguntas frequentes (expansível) para `/servicos` nos resultados de busca, perdendo espaço extra na SERP e cliques potenciais para consultas informacionais como "dread danifica o cabelo" e "quanto custa para fazer dreads" — que a própria Fase 1 já identificou como intenções de busca primárias do negócio.
**GEO IMPACT:** Perguntas e respostas estruturadas em `FAQPage` são um dos formatos mais citáveis por assistentes de IA (ChatGPT, Perplexity, Gemini) porque isolam claramente pergunta↔resposta. Hoje esse conteúdo só existe como texto solto dentro de `<details>`, exigindo que a IA infira a estrutura em vez de recebê-la pronta.
**SEVERITY:** HIGH
**RECOMMENDED ACTION:** Gerar um JSON-LD `FAQPage` a partir do próprio array `FAQ_ITEMS` já existente em `src/app/servicos/page.tsx` (fonte única, sem duplicar conteúdo) e injetá-lo na página, seguindo o mesmo padrão de `dangerouslySetInnerHTML` usado em `layout.tsx` para o `businessJsonLd`.

---

## MEDIUM

### 3. Nenhuma outra marcação schema.org além de um único bloco `HairSalon`
**ISSUE:** Em todo o repositório existe apenas um bloco JSON-LD (`businessJsonLd` em `src/lib/seo.ts`, injetado globalmente em `layout.tsx`). Não há `BreadcrumbList`, `Review` individual (apenas o agregado, ver item 1), `ImageObject`/`VideoObject` para as fotos e vídeos de portfólio, nem `Service` como entidade própria fora do `hasOfferCatalog`.
**EVIDENCE:** `grep -rn "schema.org\|application/ld+json" src/` retorna apenas `src/lib/seo.ts` e `src/app/layout.tsx`.
**TYPE:** Dados estruturados / arquitetura de schema.
**SEO IMPACT:** Sem `BreadcrumbList`, o Google não tem garantia de exibir a trilha de navegação (ex. "afrodreads.com.br › Serviços") na SERP. Sem marcação de imagem/vídeo, o rico conteúdo visual do portfólio (que a Fase 1 já identificou como prova social forte) fica invisível para Google Imagens/Vídeos como entidade estruturada.
**GEO IMPACT:** Menos pontos de dado estruturado citável para IAs além do resumo textual do `llms.txt`.
**SEVERITY:** MEDIUM
**RECOMMENDED ACTION:** Avaliar, nas próximas fases de conteúdo/arquitetura (Fase 8/11), adicionar `BreadcrumbList` nas páginas internas e considerar `VideoObject`/`ImageObject` para os cases de antes/depois do portfólio.

### 4. Cinco famílias de fontes carregadas no layout raiz compartilhado por todo o site
**ISSUE:** `src/app/layout.tsx` importa 5 famílias via `next/font/google` (Anton, Inter, Instrument Serif, DM Sans, DM Mono) e aplica todas como variáveis CSS na tag `<body>` do layout raiz, que envolve **todas** as rotas do site (marketing e admin/checkout).
**EVIDENCE:** `src/app/layout.tsx:2,10-42,85` (import e `className` com as 5 variáveis); comentário no próprio código confirma a causa: "Novo design system ('Claude Design')... Admin/checkout continuam com Anton/Inter acima, sem mudança" (linhas 21-24); `grep -rl "font-display" src/` mostra que Anton só é usado de fato em páginas de admin/checkout/agendamento (9 arquivos), nunca nas páginas públicas de marketing; `tailwind.config.ts` confirma que `font-body` (Inter) é a fonte padrão herdada por todo texto do site (aplicada na `<body>`), enquanto `font-serif`/`font-sans`/`font-mono` (Instrument Serif/DM Sans/DM Mono) só aparecem nos componentes de marketing.
**TYPE:** Performance / Core Web Vitals (CLS, LCP) — **INFERÊNCIA quanto ao impacto real**, fato verificado quanto à causa no código.
**SEO IMPACT:** Nenhum impacto direto de indexação, mas Core Web Vitals é fator de ranqueamento; carregar/pré-carregar fontes que uma página não usa desperdiça largura de banda e prioridade de rede no carregamento inicial, o que pode adiar a pintura de texto (FOUT/CLS) nas páginas públicas.
**GEO IMPACT:** Nenhum diretamente.
**SEVERITY:** MEDIUM
**RECOMMENDED ACTION:** Não foi medido nenhum número de performance real — **rode o PageSpeed Insights** (mobile e desktop) nas 4 páginas públicas para confirmar se isso está de fato custando CLS/LCP antes de priorizar a correção. Se confirmado, considerar separar Anton/Inter (admin/checkout) das fontes de marketing usando route groups do Next.js com layouts próprios, assim que a migração do design system mencionada no comentário do código for concluída.

### 5. Assets estáticos do `public/` (imagens e vídeos) sem cache de longo prazo
**ISSUE:** Vídeos e imagens servidos diretamente de `public/` (ex.: `hero.mp4`) retornam `Cache-Control: public, max-age=0, must-revalidate`, obrigando o navegador a revalidar (round-trip de rede, mesmo que resulte em 304) a cada carregamento, em vez de usar cache local por um período longo.
**EVIDENCE:** `curl -sI https://www.afrodreads.com.br/hero.mp4` → `Cache-Control: public, max-age=0, must-revalidate`; o mesmo padrão aparece nas páginas HTML (esperado no Next.js/Vercel, que usa cache próprio via `X-Vercel-Cache`/`X-Nextjs-Stale-Time`), mas para um arquivo de mídia estático em `public/` isso não é o ideal. `next.config.mjs` não define nenhuma função `headers()` customizada — é o comportamento padrão do projeto, não uma configuração deliberada.
**TYPE:** Performance / cache HTTP.
**SEO IMPACT:** Indireto, via Core Web Vitals: visitantes recorrentes (e o próprio Googlebot em recrawls) pagam uma requisição de revalidação extra para cada vídeo/imagem em vez de usar o cache do disco.
**GEO IMPACT:** Nenhum direto.
**SEVERITY:** MEDIUM
**RECOMMENDED ACTION:** Adicionar uma função `headers()` em `next.config.mjs` definindo `Cache-Control: public, max-age=31536000, immutable` (ou um valor mais conservador, tipo `max-age=86400`, já que os nomes de arquivo em `public/` não são versionados/hasheados) para os caminhos de imagem e vídeo.

### 6. Arquitetura de URL: serviços não têm página própria, só âncoras dentro de `/servicos`
**ISSUE:** Os 9 serviços (`Primeira aplicação`, `Microlocs`, `Retwist`, `Revitalização`, `Start Locs`, `Penteados`, `Short Dread`, `Cultivo Agulhado` etc.) só existem como seções com `id` dentro da URL única `/servicos` (ex. `/servicos#cultivo-agulhado`), sem uma URL indexável própria para cada um.
**EVIDENCE:** `src/app/sitemap.ts` lista só 4 rotas (`""`, `/servicos`, `/portfolio`, `/contato`); os `id`s por serviço (`id="cultivo-agulhado"` etc.) foram confirmados no HTML bruto de `/servicos`, mas fragmentos de URL (`#...`) não são indexados como páginas separadas pelo Google; `src/lib/seo.ts` já usa `${SITE_URL}/servicos#${service.slug}` como `url` de cada `Offer` no JSON-LD, ou seja, o próprio schema aponta para uma âncora, não uma página.
**TYPE:** Arquitetura de informação / estrutura de URL.
**SEO IMPACT:** Cada serviço perde a chance de ranquear individualmente para buscas de cauda longa específicas (ex. "cultivo agulhado dreadlocks", "start locs preço", "short dread SP") porque todos competem pela mesma URL `/servicos` e pelo mesmo par título/meta description. Já é um achado consistente com a Fase 1, que identificou 3 serviços (Start Locs, Short Dread, Cultivo Agulhado) fora do radar do `business-context.md`.
**GEO IMPACT:** IAs generativas tendem a citar URLs específicas por tópico; hoje só podem citar `/servicos` inteira para qualquer um dos 9 serviços.
**SEVERITY:** MEDIUM
**RECOMMENDED ACTION:** Não é uma correção "técnica" isolada — é uma decisão de arquitetura de conteúdo. Repassar para as fases de arquitetura/conteúdo (Fase 8/11, hoje pendentes) a avaliação de páginas dedicadas por serviço (`/servicos/[slug]`) versus manter a página única atual.

---

## LOW

### 7. `lastModified` do sitemap sempre reflete a data do build, não da última mudança real de conteúdo
**ISSUE:** `sitemap.ts` usa `lastModified: new Date()` para todas as URLs, então toda vez que o site é reconstruído/publicado, todas as 4 URLs do sitemap recebem o mesmo `lastmod`, independentemente de o conteúdo daquela página específica ter mudado ou não.
**EVIDENCE:** `src/app/sitemap.ts:12-15`; confirmado ao vivo — `https://www.afrodreads.com.br/sitemap.xml` mostra o mesmo `<lastmod>2026-09-26T17:33:46.225Z</lastmod>` nas 4 URLs.
**TYPE:** Sitemap / sinal de rastreamento.
**SEO IMPACT:** Reduz a utilidade do campo `lastmod` como sinal de priorização de recrawl para o Googlebot — ele deveria refletir quando o conteúdo daquela página específica mudou, não a data do deploy.
**GEO IMPACT:** Nenhum direto.
**SEVERITY:** LOW
**RECOMMENDED ACTION:** Se for viável sem trabalho desproporcional, atrelar `lastModified` de cada rota a uma data real de alteração de conteúdo (ex. data do último commit que tocou aquele arquivo/página); caso contrário, manter como está — o impacto é pequeno.

### 8. Favicon único de ~97 KB (841×841) sem variantes redimensionadas, sem `apple-touch-icon` nem `manifest.json`
**ISSUE:** O ícone do site é servido a partir de um único arquivo de 97.385 bytes em 841×841px, sem tag `apple-touch-icon` nem `manifest.json` para PWA/"adicionar à tela inicial".
**EVIDENCE:** `src/app/icon.png` (97.385 bytes, `ls -la`); HTML ao vivo mostra `<link rel="icon" href="/icon.png?icon.3o2m2r96y79fr.png" sizes="841x841" type="image/png"/>`; `curl` confirma 97.385 bytes baixados; busca por `manifest`/`apple-touch-icon` no HTML bruto e por arquivos `apple-icon*`/`*manifest*` em `src/app` não encontrou nenhuma ocorrência.
**TYPE:** Usabilidade mobile / metadados de ícone.
**SEO IMPACT:** Mínimo — não é fator de ranqueamento direto, mas um favicon desnecessariamente grande é uma requisição extra maior que o necessário em toda navegação.
**GEO IMPACT:** Nenhum.
**SEVERITY:** LOW
**RECOMMENDED ACTION:** Fornecer uma versão menor e otimizada do ícone (ex. 512×512 como fonte, deixando o Next.js gerar os tamanhos derivados) e considerar adicionar `apple-touch-icon` e um `manifest.json` básico se o dono quiser reforçar a experiência de "salvar na tela inicial" no celular.

### 9. Divergência entre o slug interno `retwist-twist` e o nome público "Start Locs"
**ISSUE:** O serviço exibido como "Start Locs" mantém o slug/id técnico `retwist-twist` em `src/lib/services.ts`, refletido na âncora pública `/servicos#retwist-twist` e como valor de filtro no portfólio.
**EVIDENCE:** `src/lib/services.ts:53-61` (`slug: "retwist-twist"`, `name: "Start Locs"`); confirmado ao vivo — `id="retwist-twist"` existe no HTML de `/servicos`; já identificado na Fase 1 (`01-business.md`) como possível resquício de rename.
**TYPE:** Consistência de URL/nomenclatura.
**SEO IMPACT:** Não afeta indexação (fragmentos de âncora não são rastreados como páginas), mas se algum dia esse link `#retwist-twist` for compartilhado externamente ou usado em anúncios, o fragmento na URL não corresponde ao nome público do serviço.
**GEO IMPACT:** Nenhum direto.
**SEVERITY:** LOW
**RECOMMENDED ACTION:** Sem urgência; se o slug for renomeado no futuro, ajustá-lo para `start-locs` de forma consistente em `services.ts`, no schema e no filtro do portfólio.

### 10. Campo `image` do JSON-LD aponta para o ícone/logo, não para uma foto real do trabalho
**ISSUE:** O `image` do bloco `HairSalon` aponta para `/icon.png` (o ícone/logo da marca), não para uma fotografia real de um dread finalizado ou da fachada/ambiente do estúdio.
**EVIDENCE:** `src/lib/seo.ts:17` (`image: \`${SITE_URL}/icon.png\``).
**TYPE:** Dados estruturados / boas práticas de imagem para LocalBusiness.
**SEO IMPACT:** Baixo — o campo é opcional e aceita qualquer imagem válida, mas o Google recomenda usar uma foto representativa do negócio (produto/ambiente) em vez de um logo para esse campo específico.
**GEO IMPACT:** Nenhum direto.
**SEVERITY:** LOW
**RECOMMENDED ACTION:** Trocar por uma das fotos reais já existentes em `public/` (ex. uma foto de "depois" do portfólio) quando for conveniente.

---

## Pontos verificados sem problema

- **Indexabilidade geral:** nenhuma tag `<meta name="robots">` bloqueando indexação em nenhuma das 4 páginas públicas testadas; todas retornam HTTP 200.
- **`robots.txt` (ao vivo):** libera `Googlebot`, `Bingbot` e bots de IA (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Claude-User`, `ClaudeBot`, `Google-Extended`) explicitamente, bloqueia corretamente apenas as áreas transacionais/privadas (`/admin`, `/api`, `/checkout`, `/orcamento`, `/agendamento`) e referencia o `sitemap.xml` corretamente.
- **`sitemap.xml` (ao vivo):** XML válido, contém as 4 páginas públicas de conteúdo com prioridades coerentes (home = 1.0, demais = 0.8); rotas privadas corretamente ausentes.
- **HTTPS/HSTS:** `Strict-Transport-Security: max-age=63072000` presente; `http://www.afrodreads.com.br/` redireciona (308) para `https://`.
- **Canonicalização de domínio:** `https://afrodreads.com.br/` (sem `www`) redireciona (308) para `https://www.afrodreads.com.br/` — consistente com a migração de DNS para a Vercel já registrada na memória do projetos. `/servicos/` (com barra final) redireciona (308) para `/servicos` (sem barra) — sem duplicidade de URL.
- **Tags `<link rel="canonical">`:** presentes e corretas nas 4 páginas (home aponta para `/`, e `/servicos`, `/portfolio`, `/contato` apontam para si mesmas), confirmadas no HTML bruto ao vivo.
- **Title e meta description:** únicos, descritivos e dentro do tamanho recomendado (~140-146 caracteres na description, ~52-60 na title) em todas as 4 páginas públicas; verificado tanto no código (`metadata` do Next.js) quanto no HTML servido.
- **H1:** exatamente um `<h1>` por página, presente no HTML bruto (renderizado no servidor), coerente com o conteúdo de cada página.
- **Open Graph / Twitter Card:** completos na home (`og:title`, `og:description`, `og:url`, `og:image` 1200×630, `og:locale`, `og:type`, `twitter:card`), gerados dinamicamente por `opengraph-image.tsx`.
- **Renderização server-side do conteúdo relevante para SEO/GEO:** o FAQ de 9 perguntas em `/servicos`, os depoimentos e os textos institucionais aparecem no HTML bruto antes do JavaScript rodar (confirmado via `curl`, sem executar JS) — não há conteúdo importante escondido atrás de renderização client-only.
- **JSON-LD:** um único bloco, bem formado (JSON válido), com endereço em nível de bairro/cidade (decisão deliberada do dono, não é erro), catálogo de ofertas com as 9 entidades de serviço e URLs, horário de funcionamento e `sameAs` para WhatsApp/Instagram/TikTok/YouTube.
- **`/llms.txt`:** implementado, acessível (não bloqueado no `robots.txt`), com resumo do negócio, lista de serviços (gerada a partir da mesma fonte única `SERVICES`) e links para as páginas principais — recurso incomum e positivo para GEO.
- **Compressão HTTP:** Brotli confirmado (`Content-Encoding: br`) nas respostas HTML (ex.: `/servicos` caiu de 79 KB para ~11,6 KB).
- **Imagens:** uso consistente de `alt` descritivo (inclusive textos "antes"/"depois" diferenciados) nos componentes de portfólio; `SafeImage` evita ícone de imagem quebrada quando um arquivo ainda não foi enviado.
- **Vídeos:** com exceção do vídeo do Hero (que tem propósito de "primeira impressão" e é pequeno, ~226 KB), todos os vídeos de portfólio e da seção final usam `preload="none"` + `IntersectionObserver` para só carregar/tocar quando entram na tela — boa prática já implementada. Tamanhos de arquivo (`ls -la public/*.mp4`) ficam entre ~220 KB e ~890 KB por vídeo, o que não indica um problema óbvio de peso — **INFERÊNCIA**: para confirmar o impacto real em Core Web Vitals (LCP/CLS/INP), rodar o PageSpeed Insights nas páginas públicas.
- **Viewport mobile:** `<meta name="viewport" content="width=device-width, initial-scale=1"/>` presente em todas as páginas testadas.
- **Estrutura de navegação:** header/footer com links internos consistentes para as 4 páginas públicas; nenhuma página órfã identificada dentro do conjunto de páginas públicas.
