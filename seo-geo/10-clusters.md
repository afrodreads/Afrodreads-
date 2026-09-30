# Fase 10 — Topical Authority & Clusters (Agente 10)

Base: `01-business.md`, `03-inventory.md`, `04-competitors.md`, `05-keywords.md`, `06-serp.md`, `07-geo.md`, `08-entities.md`, `09-local.md`.
Legenda: **FATO VERIFICADO** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

> **Aviso sobre demanda:** nenhum volume de busca foi verificado (`05-keywords.md`). Por isso nenhum cluster é classificado como "PROVEN DEMAND". A demanda é tratada como **sinal de SERP** (existem guias dedicados, Fresha faz páginas por bairro, TikTok/YouTube respondem consultas práticas) e será medida com o Search Console (coleta iniciada em 26/09/2026).

Tipos de oportunidade usados: COMPETITIVE GAP · CONTENT QUALITY GAP · TOPICAL AUTHORITY GAP · COMMERCIAL GAP · GEO GAP · LOCAL GAP · EMERGING TOPIC.

---

## Resumo dos 6 clusters

| # | Cluster | Papel no negócio | Oportunidade dominante |
|---|---|---|---|
| 1 | Microlocs | Serviço premium (8–12 h) | COMPETITIVE GAP + GEO GAP (zero guias em pt-BR) |
| 2 | Métodos e serviços exclusivos (Cultivo Agulhado, Start Locs, Short Dread) | Diferenciais da marca | COMPETITIVE GAP + EMERGING TOPIC |
| 3 | Primeira vez: decidir e se preparar | Entrada do funil (quem nunca fez) | CONTENT QUALITY GAP |
| 4 | Manutenção e cuidados (Retwist) | Receita recorrente | TOPICAL AUTHORITY GAP |
| 5 | Revitalização e dreads danificados | Alto ticket, público "vim de outro salão" | CONTENT QUALITY GAP + COMMERCIAL GAP |
| 6 | Marca, preço e local (Pirituba) | Conversão e entidade | LOCAL GAP + COMMERCIAL GAP |

---

## Cluster 1 — Microlocs

| Campo | Conteúdo |
|---|---|
| **PILLAR** | Guia "Microlocs: o que são, como funcionam, quanto tempo levam e o que define o preço" (`/blog/microlocs-o-que-sao-como-funcionam`) |
| **COMMERCIAL PAGE** | `/servicos/microlocs` |
| **PRIMARY KEYWORD** | microlocs |
| **INTENT** | Informacional + comercial |
| **BUSINESS PURPOSE** | Vender o serviço de maior duração e ticket (8–12 h — `src/lib/services.ts`) |
| **SEO VALUE** | ALTO — a SERP em pt-BR não tem guia completo; resultados são em inglês, Instagram e TikTok (`05-keywords.md`) |
| **GEO VALUE** | ALTÍSSIMO — as IAs não têm fonte em pt-BR para citar (`07-geo.md`, Prompt 3) |
| **SUPPORTING KEYWORDS** | microlocs vs dreads · microdreads · microlocs preço (fatores) · quanto tempo dura microlocs · microlocs cabelo crespo/cacheado · sisterlocks (só como comparação) |
| **SUPPORTING ARTICLES** | (a) Microlocs vs dreads; (b) Quanto custa e o que define o preço dos microlocs; (c) Microlocs: cuidados e manutenção (depende do dono) |
| **OPORTUNIDADE** | COMPETITIVE GAP · GEO GAP · EMERGING TOPIC |
| **AUTORIDADE** | Fotos e vídeos próprios já existem (`public/microlocs-*.mp4`, `microlocs-antes/depois.jpg`) — E-E-A-T real que os portais editoriais não têm |

## Cluster 2 — Métodos e serviços exclusivos

| Campo | Conteúdo |
|---|---|
| **PILLAR** | Uma página-guia por método, cada uma ligada à sua página de serviço |
| **PÁGINAS COMERCIAIS** | `/servicos/cultivo-agulhado`, `/servicos/start-locs`, `/servicos/short-dread` |
| **PRIMARY KEYWORDS** | cultivo agulhado dreadlocks · start locs · short dread |
| **INTENT** | Informacional ("o que é") → comercial |
| **BUSINESS PURPOSE** | Ocupar termos que só a Afro Dreads oferece com clareza e tirar o site do "só home" |
| **SEO VALUE** | ALTO — Cultivo Agulhado: SERP praticamente só TikTok, sem conteúdo escrito; Start Locs: resultados quase todos em inglês (`05-keywords.md`) |
| **GEO VALUE** | ALTO — sem cobertura web em pt-BR (`07-geo.md`, lacuna 6) |
| **SUPPORTING ARTICLES** | "Cultivo agulhado: o que é"; "Start locs: o que é e para quem serve"; "Dread em cabelo curto: dá para fazer?" |
| **OPORTUNIDADE** | COMPETITIVE GAP · EMERGING TOPIC |
| **OBSERVAÇÃO** | "Cultivo Agulhado — feito exclusivamente com o próprio cabelo, sem extensões" é a única definição publicada hoje (`src/lib/services.ts`). O dono precisa detalhar o método (ver briefs) |

## Cluster 3 — Primeira vez: decidir e se preparar

| Campo | Conteúdo |
|---|---|
| **PILLAR** | "Como fazer dreads pela primeira vez: o que saber antes" (`/blog/como-fazer-dreads-primeira-vez`) |
| **COMMERCIAL PAGE** | `/servicos/primeira-aplicacao` (uma única página cobrindo "topo" e "cabeça toda" — mesma intenção, evita canibalização) |
| **PRIMARY KEYWORD** | o que saber antes de fazer dreads · como fazer dreads |
| **INTENT** | Informacional → transacional |
| **BUSINESS PURPOSE** | Atender o público "nunca fiz" e a confusão sobre métodos, que o dono hoje resolve por áudio individual (`business-context.md`) |
| **SEO VALUE** | MÉDIO — SERP dominada por guias longos de portais (todecacho, stealthelook…) mas sem experiência de profissional |
| **GEO VALUE** | ALTO — perguntas que pessoas fazem a assistentes de IA |
| **SUPPORTING ARTICLES** | Dreads vs tranças · Quanto tempo dura fazer dreads · Dread danifica o cabelo · Tipos de dreads e métodos · Dread natural vs sintético |
| **OPORTUNIDADE** | CONTENT QUALITY GAP · GEO GAP |

## Cluster 4 — Manutenção e cuidados

| Campo | Conteúdo |
|---|---|
| **PILLAR** | "Manutenção de dreads: retwist, quando fazer e como cuidar" (`/blog/manutencao-de-dreads-retwist`) |
| **COMMERCIAL PAGE** | `/servicos/retwist` |
| **PRIMARY KEYWORD** | retwist dreads · manutenção de dreads sp |
| **INTENT** | Informacional + comercial local |
| **BUSINESS PURPOSE** | Receita recorrente (retwist 3–5 h) |
| **SEO VALUE** | ALTO — YouTube/TikTok dominam; poucos artigos em pt-BR (`05-keywords.md`) |
| **GEO VALUE** | ALTO — fontes em inglês dominam "retwist" (`07-geo.md`) |
| **SUPPORTING ARTICLES** | Como lavar dreads · Como cuidar de dreads no dia a dia · Frequência de retwist (o dono informa) |
| **OPORTUNIDADE** | TOPICAL AUTHORITY GAP |

## Cluster 5 — Revitalização e dreads danificados

| Campo | Conteúdo |
|---|---|
| **PILLAR** | "Revitalização de dreads: quando fazer e como funciona" (`/blog/revitalizacao-de-dreads`) |
| **COMMERCIAL PAGE** | `/servicos/revitalizacao` |
| **PRIMARY KEYWORD** | revitalização de dreads |
| **INTENT** | Informacional + comercial |
| **BUSINESS PURPOSE** | Capturar quem veio de outro salão e tem medo de danificar (objeção principal — `business-context.md`) |
| **SEO VALUE** | ALTO — a SERP mistura cuidados caseiros com serviço; não há página de serviço profissional forte (`05-keywords.md`) |
| **GEO VALUE** | ALTO |
| **SUPPORTING ARTICLES** | Dread danifica o cabelo? · Alopecia por tração e dreads · Dreads mal feitos: o que fazer |
| **OPORTUNIDADE** | CONTENT QUALITY GAP · COMMERCIAL GAP |

## Cluster 6 — Marca, preço e local

| Campo | Conteúdo |
|---|---|
| **PILLAR** | Página "Sobre" (`/sobre`) e "Como agendar: orçamento, sinal e cancelamento" (`/como-agendar`) |
| **COMMERCIAL PAGE** | `/contato` (existente) e Google Business Profile |
| **PRIMARY KEYWORD** | dreads em pirituba · agendar dreads pirituba · quanto custa fazer dreads |
| **INTENT** | Local/comercial |
| **BUSINESS PURPOSE** | Ancorar a marca em Pirituba, esclarecer preço sem publicar valores, reduzir fricção da conversão no WhatsApp |
| **SEO VALUE** | ALTÍSSIMO local — SERP hiperlocal quase vazia (`05-keywords.md`) |
| **GEO VALUE** | ALTO — entidade Lyon/Thay/Pirituba inexistente hoje (`08-entities.md`) |
| **SUPPORTING ARTICLES** | Quanto custa fazer dreads em SP (fatores, sem valores) · Dreads antes e depois (portfólio com texto) · "Como chegar" |
| **OPORTUNIDADE** | LOCAL GAP · COMMERCIAL GAP |

---

## Conflitos de intenção resolvidos (anti-canibalização)

| Intenção | Página vencedora | O que NÃO criar |
|---|---|---|
| "microlocs" comercial | `/servicos/microlocs` | Segunda página de serviço de microlocs |
| "microlocs o que é" | Guia no blog | Duplicar o texto da página de serviço |
| "microdreads" | Tratada como sinônimo dentro do guia e da página de serviço | Página própria (regra do dono: o estúdio usa só "Microlocs") |
| Primeira aplicação topo × cabeça toda | 1 página `/servicos/primeira-aplicacao` | 2 páginas com a mesma intenção |
| "dreads perto de mim" | Google Business Profile | Página "perto de mim" |
| Preço | Artigo de fatores + `/como-agendar` | Tabela de preços (decisão do dono) |
