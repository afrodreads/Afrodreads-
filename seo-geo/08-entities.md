# Fase 8 — Entity SEO (Agente 8)

Site: https://www.afrodreads.com.br/
Base: `01-business.md`, `02-technical.md`, `03-inventory.md`, `07-geo.md`, código-fonte (`src/lib/seo.ts`, `src/lib/services.ts`, `src/app/llms.txt/route.ts`).
Legenda: **FATO VERIFICADO** · **FONTE EXTERNA** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

## 1. Mapa de entidades

| Tipo | Entidade | Onde existe hoje | Tag |
|---|---|---|---|
| Empresa/Marca | Afro Dreads | Site, JSON-LD `HairSalon`, llms.txt, Instagram @afrodreads_, TikTok @afrodreads_, YouTube @afrodreadsofc, Google Business Profile | FATO VERIFICADO (`src/lib/seo.ts`, `sameAs`) |
| Pessoas | Lyon e Thay (fundadores) | **Nenhum lugar do site**; só no depoimento "casal da Afro Dreads" (André A.) e no contexto do cliente | INFORMADO PELO CLIENTE; ausência no site = FATO VERIFICADO (grep no código e 4 páginas públicas) |
| Serviços | Primeira aplicação (topo), Primeira aplicação (cabeça toda), Microlocs, Retwist, Revitalização, Start Locs, Penteados, Short Dread, Cultivo Agulhado | JSON-LD `OfferCatalog`, `/servicos`, llms.txt | FATO VERIFICADO (`src/lib/services.ts`) |
| Local | Pirituba, zona noroeste de São Paulo, São Paulo–SP, Brasil | JSON-LD (`addressLocality`), contato, llms.txt | FATO VERIFICADO |
| Local (sazonal) | São Luís do Maranhão | Só no contexto do cliente e no modelo de dados (`isOutOfTownSeason`); **não** aparece no site público | INFORMADO PELO CLIENTE |
| Indústria | Cabelo afro / dreadlocks / locs | Copy do site | FATO VERIFICADO |
| Conceitos | Dreadlocks, microlocs (sinônimo de busca: "microdreads"), retwist, start locs, cultivo agulhado, sisterlocks (entidade associada na SERP), tranças (entidade de confusão) | Parcial: FAQ cita tranças; microlocs/start locs/cultivo têm 1 linha de descrição | FATO VERIFICADO (`/servicos`) + FONTE EXTERNA (`07-geo.md`) |
| Problemas | Medo de danificar o cabelo, alopecia por tração, confusão dreads×tranças, preço, tempo de sessão | Só no FAQ (accordion, sem schema) | FATO VERIFICADO |
| Concorrentes | Estúdio Baroni, Fresha, Gaia Dreads & Arts, Agulheria Dread SP, Cabelos Poderosos, Tode Cacho, dread.com.br | — | FONTE EXTERNA (`04-competitors.md`, `07-geo.md`) |
| Publicações/menções externas | Nenhuma encontrada para a marca | — | FATO VERIFICADO (20 buscas, `07-geo.md`; a única presença externa é o Instagram) |

## 2. As relações-chave estão estabelecidas?

| Relação | Estado | Evidência |
|---|---|---|
| Afro Dreads → **oferece** → serviço | ✅ Parcial | `OfferCatalog` no JSON-LD e lista em `/servicos`; cada serviço tem 1 frase e **nenhuma URL própria** (só âncora) |
| Pessoa → **trabalha em** → Afro Dreads | ❌ Ausente | Sem página Sobre, sem `Person`/`founder` no schema, sem bios |
| Afro Dreads → **localizada em** → Pirituba/SP | ⚠️ Fraca | Aparece no schema, contato e meta description, mas sem conteúdo textual sobre o bairro (`07-geo.md`, Prompt 4) |
| Serviço → **resolve** → problema | ⚠️ Fraca | O FAQ responde, mas dentro de accordion sem `FAQPage`; não há página que ligue "dread danifica?" → Revitalização/Retwist |
| Afro Dreads → **atua em** → indústria | ✅ | Posicionamento claro (HairSalon, dreadlocks/microlocs) |
| Marca → **associada a** → cultura afro-brasileira | ⚠️ Só visual | Identidade forte no design e nos depoimentos ("respeito pela cultura"), mas sem texto que explicite e sem fonte externa |
| Marca → **citada por** → terceiros | ❌ Ausente | Nenhum diretório/portal cita a marca (`07-geo.md`) |

## 3. Diagnóstico de consistência (nome, contato, perfis)

| Ponto | Achado | Tag |
|---|---|---|
| Nome | "Afro Dreads" consistente em title, JSON-LD, llms.txt, Instagram. Domínio `afrodreads.com.br`; handles `@afrodreads_` (Instagram/TikTok) e `@afrodreadsofc` (YouTube, e-mail `afrodreadsofc@gmail.com`) — dois sufixos diferentes | FATO VERIFICADO |
| Telefone | `+55 11 91538-8113` no JSON-LD e llms.txt; o CTA usa `wa.me/message/WFY4THHQSOITF1` (link de mensagem, não o número) | FATO VERIFICADO |
| Horário | JSON-LD e llms.txt: terça a sábado, 10h–18h | FATO VERIFICADO (código); **não verificado** se bate com o Google Business Profile → INFERÊNCIA de risco de inconsistência |
| Endereço | Só bairro/cidade, por decisão do dono | INFORMADO PELO CLIENTE — **não recomendar publicar** |
| Nota do Google | 5,0 / 56 avaliações fixas no código (já apontado como HIGH na Fase 2) | FATO VERIFICADO |
| Perfil externo com dado de terceiros | Nenhum diretório (Fresha, GetNinjas, dread.com.br) lista a marca | INFERÊNCIA (não encontrada nas buscas) |

## 4. Recomendações de Entity SEO

Todas são **RECOMENDAÇÃO**; o que depende de informação do dono está marcado.

1. **Criar a página "Sobre" (`/sobre`)** com Lyon e Thay: história, como começaram, método de trabalho, fotos reais dos dois trabalhando, origem em São Luís do Maranhão, e o que a Afro Dreads faz e **não** faz (tranças). *Depende do dono:* nomes completos que quiser publicar, anos de experiência, número real de clientes, cursos/formações. Nada disso pode ser inventado.
2. **Marcar as pessoas no schema:** `Person` (Lyon, Thay) ligada à organização por `founder`/`employee`, e `Organization` com `name`, `alternateName`, `logo`, `sameAs`.
3. **Uma URL por serviço** (`/servicos/microlocs` etc.) para cada serviço virar uma entidade com página própria; hoje são só âncoras. Detalhado na Fase 11.
4. **Reforçar Pirituba/zona noroeste em texto**: seção "Onde estamos" na home e `/contato` com como chegar por transporte público e pontos de referência do bairro (sem endereço completo).
5. **Unificar handles** quando possível (ou ao menos listar todos em `sameAs` e na página Sobre): Instagram, TikTok, YouTube, Google Business Profile.
6. **Construir presença externa verificável:** cadastro no Fresha e no GetNinjas, pedido de inclusão no dread.com.br, e checar o Google Business Profile (categoria principal, serviços, horário igual ao do site, fotos, respostas às avaliações). O link do GBP fornecido pelo dono é `https://share.google/hdE6lHpW06wTsRZvc`.
7. **Conectar problema → serviço no conteúdo**: cada artigo de objeção ("dread danifica o cabelo?") deve linkar para o serviço que resolve.
8. **Sincronizar dados**: horário, telefone e serviços iguais no site, JSON-LD, llms.txt, GBP e redes. Criar uma única fonte de verdade no código (o `SERVICES` já faz isso para serviços).
9. **Explicitar a associação com a cultura afro-brasileira** em texto próprio (página Sobre), com a voz dos fundadores — é um possível diferencial de marca. Entre os concorrentes observados (`04-competitors.md`), nenhum estúdio de SP o coloca como posicionamento; apenas o portal Cabelos Poderosos tem um artigo sobre "dreads e respeito à cultura" (FATO VERIFICADO), sem ser um estúdio. Isso é uma INFERÊNCIA baseada em amostra pequena, não uma garantia de exclusividade.

## 5. Entidades prioritárias para o conteúdo (usar sempre com nome consistente)

`Afro Dreads` · `Lyon` · `Thay` · `Pirituba` · `zona noroeste de São Paulo` · `dreadlocks` · `microlocs` (mencionar "também chamado de microdreads" só dentro do conteúdo) · `retwist` · `revitalização de dreads` · `start locs` · `cultivo agulhado` · `short dread` · `sisterlocks` (comparativo) · `tranças` (o que a Afro Dreads não faz).
