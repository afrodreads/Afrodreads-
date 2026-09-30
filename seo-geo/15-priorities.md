# Fase 15 — Priorização (Agente 15)

Sem notas numéricas inventadas: cada item é classificado ALTA / MÉDIA / BAIXA. Esforço é estimativa qualitativa (S = horas, M = dias, L = semanas). Volumes de busca: NÃO VERIFICADOS.
Legenda: FATO VERIFICADO · INFORMADO PELO CLIENTE · INFERÊNCIA · RECOMENDAÇÃO.

## 1. Matriz de prioridades

| # | Oportunidade | Relevância para o negócio | Oportunidade SEO | Oportunidade GEO | Esforço | Prioridade | Razão / evidência |
|---|---|---|---|---|---|---|---|
| 1 | **Google Business Profile** revisado (categorias, horário, serviços, fotos, respostas, pedido ativo de avaliações) | ALTA | ALTA (local) | ALTA | S | **ALTA** | Único ativo local já forte (INFORMADO PELO CLIENTE); "dreads perto de mim" depende dele (`05-keywords.md`) |
| 2 | **Consertar/decidir `aggregateRating`** | ALTA (risco) | MÉDIA | ALTA | S | **ALTA** | Achado HIGH nº 1 da Fase 2; dado fixo pode ficar errado |
| 3 | **`FAQPage` em `/servicos`** | MÉDIA | MÉDIA | ALTA | S | **ALTA** | Achado HIGH nº 2; conteúdo já existe e é visível |
| 4 | **Páginas individuais de serviço** (`/servicos/[slug]`), começando por Microlocs, Revitalização, Retwist, Primeira aplicação | ALTA | ALTA | ALTA | M | **ALTA** | Hoje serviços são só âncoras (Fase 2, MEDIUM nº 6); 4 URLs indexáveis no total (`03-inventory.md`) |
| 5 | **Guia + artigos de Microlocs** (brief 1 e 2) | ALTA (serviço premium) | ALTA | ALTA | M | **ALTA** | Zero guias em pt-BR (`05-keywords.md`, `06-serp.md` §1, §11; `07-geo.md` Prompt 3) |
| 6 | **Página `/sobre`** com Lyon e Thay | ALTA | MÉDIA | ALTA | S–M | **ALTA** | Pessoas ausentes do site e da web (`08-entities.md`) |
| 7 | **Cultivo agulhado e Start locs** (brief 7 e 8) | MÉDIA | ALTA | ALTA | M | **ALTA** | Campo vazio em pt-BR; serviços exclusivos (`05-keywords.md`) |
| 8 | **Conteúdo de objeções**: preço, dano, tranças (briefs 4, 5, 6) | ALTA | ALTA | ALTA | M | **ALTA** | Objeções relatadas pelo dono; SERP com fontes fracas (`07-geo.md` Prompts 5, 6, 7) |
| 9 | **Cadastro em Fresha e GetNinjas; pedido de inclusão no dread.com.br** | MÉDIA | MÉDIA | ALTA | S | **ALTA** | Aparecem como fontes citadas para intenção local; Afro Dreads ausente (`04`, `07`) |
| 10 | **Seção "Onde estamos / como chegar"** | MÉDIA | ALTA (local) | MÉDIA | S | **ALTA** | Associação Pirituba fraca em texto (`07-geo.md` Prompt 4) |
| 11 | **`/como-agendar`** (orçamento, sinal, cancelamento) | ALTA | MÉDIA | ALTA | S | **ALTA** | Reduz fricção; regras já existem no site |
| 12 | Blog: pilar "primeira vez" e artigos de apoio | MÉDIA | MÉDIA | ALTA | M | MÉDIA | Topo de funil; portais com autoridade alta concorrem (`06-serp.md`) |
| 13 | Blog: manutenção/retwist e revitalização (pilares) | ALTA (recorrência) | MÉDIA | MÉDIA | M | MÉDIA | SERP misturada; conteúdo de profissional falta |
| 14 | Portfólio com texto descritivo | MÉDIA | MÉDIA | MÉDIA | S–M | MÉDIA | Hoje é quase só visual (`03-inventory.md`) |
| 15 | Cache longo em assets de `public/` | BAIXA | BAIXA–MÉDIA | BAIXA | S | MÉDIA | Fase 2, MEDIUM nº 5 (**impacto real deve ser medido no PageSpeed Insights**) |
| 16 | Reduzir famílias de fontes (5) | BAIXA | BAIXA–MÉDIA | BAIXA | M | MÉDIA | Fase 2, MEDIUM nº 4 — INFERÊNCIA sobre CLS; medir antes |
| 17 | `sitemap.ts` com datas reais de modificação | BAIXA | BAIXA | BAIXA | S | BAIXA | Fase 2, LOW nº 7 |
| 18 | Favicon/apple-touch-icon/manifest | BAIXA | BAIXA | BAIXA | S | BAIXA | Fase 2, LOW nº 8 |
| 19 | Slug `retwist-twist` × "Start Locs" | BAIXA | BAIXA | BAIXA | S | BAIXA | Resolve-se ao criar as novas URLs |
| 20 | Glossário, tipos de dreads, natural vs sintético, penteados | BAIXA | MÉDIA (long tail) | MÉDIA | M | BAIXA | Fase 3 do roadmap |
| 21 | Menções externas (PR, parceiros, cobertura na comunidade afro) | ALTA (longo prazo) | ALTA | ALTA | L | MÉDIA | Zero menções externas hoje (`07-geo.md`); exige ação do dono |
| 22 | Páginas por bairro / "perto de mim" | — | — | — | — | **NÃO FAZER** | Conteúdo replicado; é o modelo do Fresha (`09-local.md`) |
| 23 | Tabela de preços pública | — | — | — | — | **NÃO FAZER** | Decisão do dono; pode-se explicar fatores de preço |

## 2. Top oportunidades (ranking) e evidência

1. **Microlocs em pt-BR** — *evidência:* nenhuma das buscas relevantes retornou guia em português; SERP = inglês + Instagram + TikTok (`05-keywords.md`, `06-serp.md`).
2. **Hiperlocal Pirituba/zona noroeste** — *evidência:* só Fresha e perfis de redes sociais aparecem; nenhum site próprio otimizado (`05-keywords.md`).
3. **Cultivo agulhado / Start locs** — *evidência:* SERP majoritariamente TikTok/inglês; zero conteúdo escrito em pt-BR (`05-keywords.md`).
4. **Objeções (preço, dano, tranças)** — *evidência:* portais editoriais sem experiência de praticante; GetNinjas com preços de 2021–2022 (`07-geo.md`).
5. **Entidade e presença externa (Sobre + diretórios + GBP)** — *evidência:* visibilidade zero em 20 buscas e nenhuma menção externa (`07-geo.md`).

## 3. Dependências

| Item | Depende de |
|---|---|
| Todos os briefs | Informação, fotos e vídeos do dono (E-E-A-T); consentimento de clientes para imagens |
| `/servicos/[slug]`, `/blog`, `/sobre`, `/como-agendar` | Desenvolvimento no Next.js (ler `node_modules/next/dist/docs/` antes, conforme `AGENTS.md`) |
| Schema de `Person` | Nomes/perfis que os fundadores queiram publicar |
| Medição | Search Console (coleta desde 26/09/2026), GA4/Vercel Analytics, Google Business Profile Insights, teste manual de prompts |
| Cadastro em Fresha/GetNinjas | Decisão do dono sobre comissões/condições dessas plataformas |
