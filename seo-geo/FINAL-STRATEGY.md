# Estratégia SEO + GEO — Afro Dreads

Site: https://www.afrodreads.com.br/ · Análise realizada em 26–29/09/2026.
Arquivos de apoio (todos em `seo-geo/`): `00-evidence-log.md`, `01-business.md`, `02-technical.md`, `03-inventory.md`, `04-competitors.md`, `05-keywords.md`, `06-serp.md`, `07-geo.md`, `08-entities.md`, `09-local.md`, `10-clusters.md`, `11-architecture.md`, `13-internal-linking.md`, `14-structured-data.md`, `15-priorities.md`, `17-roadmap.md`, `briefs/*.md`, `geo-prompt-tests.md`.
Legenda: **FATO VERIFICADO** (com fonte) · **FONTE EXTERNA** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

> **Limites desta análise (leia primeiro).**
> 1. **Volume de busca e dificuldade: NÃO VERIFICADOS.** Não havia exportação de Search Console, Keyword Planner, Semrush ou Ahrefs. As oportunidades são justificadas por evidência de SERP (quem aparece, em que formato), não por números de tráfego.
> 2. **Visibilidade em IA (ChatGPT, Gemini, Perplexity, Google AI Overviews) NÃO foi consultada diretamente.** Foi usada a busca web como proxy do pool de fontes citáveis. O teste real fica com o dono, na planilha `geo-prompt-tests.md`.
> 3. **Core Web Vitals: sem dados reais.** Os riscos de performance apontados são INFERÊNCIA a partir do código; falta rodar o PageSpeed Insights.
> 4. O Search Console só começou a coletar dados em **26/09/2026** (e-mails do Google para o site e para o Instagram @afrodreads_). Não existe histórico anterior.

---

## 1. Resumo executivo

**Situação atual.** O site é tecnicamente saudável (HTTPS, canonicals, robots, sitemap, Open Graph, `llms.txt`, SSR do conteúdo — `02-technical.md`), mas tem uma superfície de conteúdo minúscula: **4 páginas indexáveis, 0 artigos, 0 páginas individuais de serviço, 0 página "Sobre"** (`03-inventory.md`). Em 20 buscas de proxy para IA, o domínio **não apareceu em nenhuma** (`07-geo.md`).

**Maiores oportunidades de SEO.**
1. **Microlocs em pt-BR** — nenhuma das buscas relevantes encontrou guia em português (`05-keywords.md`).
2. **Busca hiperlocal Pirituba/zona noroeste** — só Fresha e redes sociais aparecem; nenhum site próprio otimizado.
3. **Cultivo agulhado e Start locs** — serviços do estúdio com SERP dominada por TikTok e conteúdo em inglês.

**Maiores oportunidades de GEO.** Ser a fonte citável em pt-BR para "microlocs", "cultivo agulhado", "dreads vs tranças", "dread danifica o cabelo" e "quanto custa fazer dreads", construindo ao mesmo tempo as entidades **Lyon e Thay → Afro Dreads → Pirituba**, hoje ausentes da web.

**Maiores problemas técnicos.** (HIGH) `aggregateRating` fixo no JSON-LD; FAQ de 9 perguntas em `/servicos` sem `FAQPage`. (MEDIUM) só um bloco de schema; 5 famílias de fontes; sem cache longo nos assets; serviços sem URL própria.

**Maiores lacunas de conteúdo.** Blog, páginas de serviço, Sobre, "Como agendar", conteúdo de objeção (preço, dano, tranças, tempo).

**Direção estratégica.** Transformar o conhecimento de quem atende (fotos, vídeos, explicações que hoje o dono dá por áudio) em páginas e guias claros, ligados entre si, com schema correto e presença externa (Google Business Profile, diretórios), sem publicar preços e sem criar páginas de bairro.

---

## 2. Entendimento do negócio (`01-business.md`)

| Item | Conteúdo | Tag |
|---|---|---|
| Empresa | Afro Dreads, estúdio de dreadlocks/locs dirigido por Lyon e Thay | INFORMADO PELO CLIENTE |
| Indústria | Beleza/cabelo afro (schema `HairSalon`) | FATO VERIFICADO |
| Serviços | 9: Primeira aplicação (topo), Primeira aplicação (cabeça toda), Microlocs, Retwist, Revitalização, Start Locs, Penteados, Short Dread, Cultivo Agulhado | FATO VERIFICADO (`src/lib/services.ts`) |
| Público | Nunca fez dreads · já tem (manutenção) · veio de outro salão | FATO VERIFICADO (roteador da home) |
| Geografia | Pirituba, zona noroeste de SP; temporadas fora de SP (ex.: São Luís do Maranhão) | INFORMADO PELO CLIENTE |
| Modelo | Orçamento individual (foto + referência) → sinal online (Mercado Pago) → sessão com hora marcada. Sem preços públicos | FATO VERIFICADO (`prisma/schema.prisma`) + INFORMADO |
| Problemas resolvidos | Escolha do método, medo de danificar, confusão dreads×tranças, recuperar trabalho de outro salão, manutenção | INFORMADO + FATO VERIFICADO (FAQ) |
| Conversão principal | Clique no WhatsApp | FATO VERIFICADO |

Achado: 3 serviços (**Start Locs, Short Dread, Cultivo Agulhado**) existem no site e no banco de dados, mas não estavam no contexto de negócio original; o contexto foi atualizado.

---

## 3. Auditoria técnica (`02-technical.md`)

| # | Problema | Evidência | Severidade | Impacto SEO | Impacto GEO | Ação |
|---|---|---|---|---|---|---|
| 1 | `aggregateRating` fixo (5,0 / 56) no JSON-LD sem atualização | `src/lib/seo.ts`; idêntico ao vivo e em `/llms.txt` | **HIGH** | Risco de dado desatualizado/ignorado pelo Google | IAs podem citar nota errada | Decidir: remover do schema ou atualizar por rotina |
| 2 | FAQ de `/servicos` (9 perguntas) sem `FAQPage` | Grep no repositório + HTML bruto | **HIGH** | Sem marcação estruturada | Perde "citabilidade" estruturada | Gerar `FAQPage` a partir de `FAQ_ITEMS` |
| 3 | Só 1 bloco de schema no site todo | Grep em `src/` | MEDIUM | Sem breadcrumbs/imagens/vídeos marcados | Menos contexto | Plano da Fase 14 |
| 4 | 5 famílias de fontes no layout raiz | `layout.tsx`, `tailwind.config.ts` | MEDIUM | Possível impacto em CLS (INFERÊNCIA) | — | Medir no PageSpeed antes de mexer |
| 5 | Assets de `public/` com `max-age=0, must-revalidate` | `curl -I hero.mp4` | MEDIUM | Recargas desnecessárias | — | Cache longo para assets versionados |
| 6 | Serviços só como âncoras em `/servicos` | HTML bruto | MEDIUM | Sem URL indexável por serviço | Serviço não vira entidade | `/servicos/[slug]` |
| 7 | `lastModified` do sitemap = data do build | `sitemap.ts` | LOW | Sinal de frescor pouco confiável | — | Usar datas reais |
| 8 | Favicon único de 97 KB (841×841), sem apple-touch/manifest | `curl` | LOW | — | — | Gerar variantes |
| 9 | Slug `retwist-twist` × nome "Start Locs" | `services.ts` | LOW | Âncora pública inconsistente | — | Resolver ao criar novas URLs |
| 10 | `image` do JSON-LD aponta para o logo | `seo.ts` | LOW | — | Menos contexto visual | Foto real do trabalho |

**Verificado e sem problema:** robots.txt, sitemap.xml, canonicals, HTTPS/HSTS, redirects (apex→www, http→https), titles/descriptions únicos, H1 único, Open Graph/Twitter, conteúdo do FAQ presente no HTML bruto, compressão Brotli, alt text, lazy-load de vídeos.

---

## 4. Inventário de conteúdo atual (`03-inventory.md`)

| URL | Tipo | Tópico | Intenção | Cluster | Qualidade | Valor comercial | Valor GEO |
|---|---|---|---|---|---|---|---|
| `/` | Home | Estúdio | Navegacional/Comercial | — | Boa | Alto | Médio |
| `/servicos` | Listagem + FAQ | 9 serviços | Comercial/Info | Serviços | Boa | Alto | Alto (FAQ sem schema) |
| `/portfolio` | Galeria | Trabalhos | Prova social | Portfólio | Boa (visual), pouco texto | Alto | Baixo |
| `/contato` | Conversão | Contato | Transacional | — | Boa | Alto | Baixo |

Recursos SEO/GEO existentes: `robots.txt` (libera 11 bots, incluindo os de IA), `sitemap.xml` (4 URLs), `llms.txt`, JSON-LD `HairSalon`.
Ausentes: blog, páginas de serviço, Sobre, comparações, glossário, páginas locais.

---

## 5. Análise de concorrentes (`04-competitors.md`)

| Concorrente | Domínio | Por que importa | Tópicos | Estratégia comercial | Estratégia de conteúdo | Autoridade | Lacunas |
|---|---|---|---|---|---|---|---|
| Estúdio Baroni | estudiobaroni.com.br | Estúdio de dreads mais visível em SP (7 de 20 buscas — `07-geo.md`) | Dreads SP, técnica de agulha | Preços públicos, agendamento por WhatsApp | Site de uma página, sem blog/FAQ | Matéria na Vogue, clientes famosos, +10 anos (FATO VERIFICADO no site) | Sem conteúdo informacional; sem microlocs/retwist/revitalização |
| Fresha | fresha.com | Domina buscas locais com páginas por bairro | "dreadlocks perto de mim [bairro]" | Marketplace de agendamento | Centenas de páginas programáticas | Escala e estrutura | Texto replicado; Afro Dreads não listada |
| Cabelos Poderosos | cabelospoderosos.com.br | 75+ artigos sobre dreads | Quase todo tópico informacional | Não vende serviço | Volume, com sobreposição temática | Escala | Sem experiência de praticante (INFERÊNCIA); sem microlocs/start locs/cultivo agulhado |
| Tode Cacho | todecacho.com.br | Guia pilar de dreads | Guia, dread masculino, mitos | Marca Salon Line | Guia + poucos artigos | Marca forte | Cobertura limitada (6 artigos de dreads) |
| dread.com.br | dread.com.br | Domínio exato-match; lista estúdios | Dreadmakers SP, celebridades | Diretório | Blog (site em manutenção) | Conteúdo ainda indexado | Fonte de citação que não lista a Afro Dreads |

Outros que apareceram nas buscas: Gaia Dreads & Arts (5 aparições), Agulheria Dread SP (6, só Facebook), GetNinjas (preços de 2021–2022).

**Divergência sem resolução:** os arquivos das Fases 4 e 7 trazem endereços diferentes para o Estúdio Baroni (R. Augusta 2690 × R. Aspicuelta 300). Esse dado **não é usado** em nenhuma recomendação; deve ser conferido se um dia for necessário.

## 6. Mapa de conteúdo dos concorrentes

| Concorrente | Tópicos | Clusters | Tipos de conteúdo |
|---|---|---|---|
| Baroni | Serviço, técnica, prova social | Serviços dreads SP; Autoridade | Landing única, preços, história |
| Fresha | Dreadlocks/locs por bairro | Dreads por bairro | Listagens programáticas |
| Cabelos Poderosos | Manutenção, lavagem, cabelo curto/liso, natural vs sintético, cultura, história | Cuidados; Tipos; Cultura | Artigos (75+) |
| Tode Cacho | Guia, dread masculino, mitos | Guia geral | Pilar + apoio |
| dread.com.br | Dreadmakers, celebridades, cuidados | Diretório/inspiração | Listicles |

## 7. Análise de lacunas de conteúdo

| Tipo | Lacuna | Evidência |
|---|---|---|
| **Competitive Gap** | Microlocs, start locs, cultivo agulhado, retwist e revitalização em pt-BR | Nenhum concorrente cobre (`04`, `05`, `06`) |
| **Content Quality Gap** | Objeções (dano, preço, tranças) respondidas só por portais sem experiência de praticante | `07-geo.md` Prompts 5–7 |
| **Topical Authority Gap** | Sem qualquer conteúdo informacional próprio | `03-inventory.md` |
| **Commercial Gap** | Serviços sem página própria; sem "Como agendar" | `02-technical.md` nº 6 |
| **GEO Gap** | Sem entidade de pessoa, sem menções externas, sem dados citáveis no texto | `07-geo.md`, `08-entities.md` |
| **Local Gap** | Sem conteúdo textual sobre Pirituba; ausência em Fresha/GetNinjas/dread.com.br | `09-local.md` |
| **Emerging Topic** | Microlocs, start locs, cultivo agulhado | Poucos resultados em pt-BR |
| **Proven Demand** | **Não classificado**: sem volume verificado | — |

---

## 8. Pesquisa de palavras-chave (`05-keywords.md`, 30+ termos)

Resumo das de maior valor (volume **NÃO VERIFICADO** em todas):

| Keyword | Intenção | Funil | Valor de negócio | Oportunidade SEO | Oportunidade GEO | Concorrência | Evidência |
|---|---|---|---|---|---|---|---|
| microlocs | Info + comercial | Topo-meio | Altíssimo | Altíssima | Altíssima | Baixíssima em pt-BR | Só inglês/Instagram/TikTok |
| microlocs vs dreads | Comparação | Topo-meio | Alto | Altíssima | Altíssima | Baixíssima em pt-BR | Zero resultados em pt-BR |
| dreads em pirituba | Local | Fundo | Altíssimo | Altíssima | Altíssima | Baixa | Fresha + redes sociais |
| fazer dreads sp / dreadlocks são paulo | Comercial local | Meio-fundo | Alto | Alta | Alta | Média | Fresha, Baroni, redes |
| cultivo agulhado dreadlocks | Info | Topo-meio | Médio-alto | Alta | Alta | Baixíssima | SERP = TikTok |
| start locs | Info | Topo-meio | Médio | Alta | Alta | Baixa | Quase só inglês |
| quanto custa fazer dreads | Preço | Meio-fundo | Alto | Alta | Alta | Média | GetNinjas desatualizado |
| dread danifica o cabelo | Objeção | Topo-meio | Alto | Alta | Alta | Média | Portais sem E-E-A-T |
| diferença entre dreads e tranças | Esclarecimento | Topo | Alto | Alta | Alta | Baixa | Q&A genéricos |
| revitalização de dreads | Info + comercial | Meio | Altíssimo | Alta | Alta | Média | Cuidados caseiros, não serviço |
| retwist dreads / manutenção de dreads sp | Info + comercial | Meio | Alto | Alta | Alta | Média | YouTube/TikTok |
| dreads / dreadlocks (head terms) | Info | Topo | Médio | Baixa | Média | Altíssima | Guias longos de portais — **não competir de frente** |

## 9. Análise de SERP (`06-serp.md`, 15 consultas)

O que o Google parece premiar neste nicho (FATO VERIFICADO nas buscas feitas em 28/09/2026): guias longos de portais para termos genéricos; diretórios (Fresha, GetNinjas) e Local Pack para termos locais; TikTok/YouTube para termos práticos; redes sociais onde não há site próprio forte. Lacunas: microlocs, cultivo agulhado, comparativos em pt-BR, conteúdo hiperlocal e conteúdo de praticante. Formato recomendado: página de serviço (com FAQ e mídia real) apoiada por guia de 1.500–2.000 palavras com voz profissional.

## 10. Estratégia GEO / busca por IA (`07-geo.md`, `geo-prompt-tests.md`)

- **Visibilidade da Afro Dreads (proxy por busca web):** não encontrada em 20 consultas; única presença externa: Instagram.
- **Concorrentes recorrentes:** Estúdio Baroni (7), Agulheria Dread SP (6), Gaia Dreads & Arts (5).
- **Fontes citadas por tipo:** portais editoriais (informacional), Fresha/dread.com.br/GetNinjas (local), spiegato/oque-e (comparativo), TikTok/YouTube (tutoriais).
- **Lacunas críticas:** zero blog; ausência em diretórios; pessoas não estabelecidas; associação geográfica só no schema; nenhuma menção externa; serviços exclusivos sem cobertura; dados citáveis ausentes do texto.
- **Oportunidades:** campo vazio em pt-BR para microlocs, start locs, cultivo agulhado, retwist.
- **Ações:** conteúdo de referência (briefs), `/sobre`, GBP, cadastros em diretórios, dados próprios em texto (durações reais por serviço), consistência de entidade.
- **Teste real pendente:** rodar a planilha `geo-prompt-tests.md` (22 prompts) em ChatGPT, Gemini, Perplexity e Google e registrar os resultados; repetir no dia ~90.

O `llms.txt` existente é uma boa iniciativa (resumo, serviços, links); mantê-lo sincronizado com as novas páginas. **INFERÊNCIA:** não há confirmação pública de que todos os sistemas de IA usem esse arquivo; o valor é baixo custo e coerência de entidade.

## 11. Entity SEO (`08-entities.md`)

Entidades: empresa, pessoas, 9 serviços, Pirituba/SP, indústria, conceitos, problemas. Relações fortes: empresa → serviços, empresa → indústria. Relações ausentes ou fracas: pessoa → empresa, empresa → Pirituba (só em schema), problema → serviço, marca → cultura afro-brasileira, marca → citada por terceiros. Recomendações: `/sobre`, `Person` no schema, URL por serviço, seção "Onde estamos", unificar handles, presença em diretórios, sincronizar horário/telefone/serviços.

## 12. SEO Local (`09-local.md`)

Aplica-se. Prioridades: Google Business Profile, seção "Onde estamos", diretórios, conteúdo local genuíno (deslocamento, sessões longas). **Não fazer:** páginas por bairro, página "perto de mim", endereço completo ou falso, página de São Luís sem dados reais.

## 13. Clusters de tópicos (`10-clusters.md`)

1. Microlocs · 2. Métodos e serviços exclusivos (Cultivo Agulhado, Start Locs, Short Dread) · 3. Primeira vez · 4. Manutenção e cuidados (Retwist) · 5. Revitalização e dreads danificados · 6. Marca, preço e local. Cada cluster tem pilar, artigos de apoio e página comercial.

## 14. Arquitetura de conteúdo (`11-architecture.md`)

```
/ ─ /servicos ─ /servicos/{primeira-aplicacao, microlocs, retwist, revitalizacao, start-locs, short-dread, cultivo-agulhado, penteados}
  ├ /blog ─ pilares (microlocs, primeira vez, manutenção, revitalização) + artigos de apoio
  ├ /portfolio   ├ /sobre   ├ /como-agendar   └ /contato
```
Uma URL por intenção; "Primeira aplicação" em uma única página (topo + cabeça toda).

## 15. Plano de conteúdo (`11-architecture.md`, 28 itens)

Ordem ALTA (13 itens): Microlocs (serviço + guia), Microlocs vs dreads, Sobre, Quanto custa fazer dreads, Dread danifica o cabelo, Dreads vs tranças, Cultivo agulhado, Start locs, Primeira aplicação, Revitalização, Retwist, Como agendar. MÉDIA: guias-pilar e apoio dos clusters 3–5, Short dread, preço dos microlocs, portfólio com texto. BAIXA: glossário, tipos, natural vs sintético, penteados.

## 16. Briefs (`briefs/`)

`microlocs-guia.md` · `microlocs-vs-dreads.md` · `sobre.md` · `quanto-custa-fazer-dreads.md` · `dread-danifica-o-cabelo.md` · `dreads-vs-trancas.md` · `cultivo-agulhado.md` · `start-locs.md`. Cada brief lista o que **só o dono** pode fornecer (métodos, fotos, dados reais, autorizações) — sem isso o conteúdo não deve ser publicado.

## 17. Plano de links internos (`13-internal-linking.md`)

Pilar ↔ apoio, informacional → comercial, objeção → serviço, portfólio → serviço, `/sobre` ← todas as páginas de serviço. Âncoras naturais; manter as âncoras `#slug` funcionando ou redirecioná-las.

## 18. Plano de dados estruturados (`14-structured-data.md`)

Ajustar o `HairSalon` (decidir o `aggregateRating`, trocar `image`, manter sem endereço de rua). Adicionar `FAQPage` (`/servicos` e páginas com FAQ visível), `Service` (sem preço), `Article`, `BreadcrumbList`, `Person`, `AboutPage`, `VideoObject`. **Não** marcar preço, endereço de rua nem depoimentos próprios como avaliações independentes. Exemplo de `FAQPage` pronto no arquivo, com texto real do site.

## 19. Matriz de prioridades (`15-priorities.md`)

Resumo — **ALTA:** GBP; decisão do `aggregateRating`; `FAQPage`; páginas de serviço; guia de microlocs; `/sobre`; cultivo agulhado e start locs; conteúdo de objeções; diretórios; "Onde estamos"; `/como-agendar`. **MÉDIA:** pilares de topo/manutenção/revitalização, portfólio com texto, cache, fontes (após medir), menções externas. **BAIXA:** sitemap com datas reais, favicon, slug, glossário. **NÃO FAZER:** páginas por bairro; tabela pública de preços.

## 20. Roadmap de 90 dias (`17-roadmap.md`)

- **Dias 1–30:** GBP; schema (`aggregateRating`, `image`, `FAQPage`); diretórios; coleta de material do dono; 4 páginas de serviço (Microlocs, Revitalização, Retwist, Primeira aplicação); `/sobre`; `/como-agendar`; "Onde estamos"; sitemap/llms.txt/links; linha de base de IA; PageSpeed Insights.
- **Dias 31–60:** 3 páginas de serviço restantes; 5 guias ALTA; links internos e schema; portfólio com texto; primeiros pedidos de menção externa; revisão no Search Console.
- **Dias 61–90:** pilares e apoio dos clusters 3–5; refresh com dados reais do Search Console; segunda rodada de testes de IA; reavaliar o plano com volumes reais.

## 21. Framework de KPIs

Sem baselines inventados: todas as séries começam em **26/09/2026** (Search Console) ou na primeira medição manual.

| Tipo | KPI | Onde medir |
|---|---|---|
| SEO | Impressões, cliques, posições, consultas não de marca, cliques em páginas comerciais | Search Console (site) |
| SEO | Páginas indexadas, cobertura de palavras-chave e de tópicos por cluster | Search Console |
| Conversão | Cliques no WhatsApp, agendamentos, orçamentos enviados/concluídos | Analytics (GA4 ou Vercel Analytics) + painel `/admin` (orçamentos, agendamentos) |
| Local | Buscas/visualizações do perfil, ligações, "como chegar", avaliações novas | Google Business Profile Insights |
| GEO | Menções, citações e inclusão como fonte nos 22 prompts; associação correta de entidade; visibilidade por prompt; menções de concorrentes; fontes citadas | Teste manual (`geo-prompt-tests.md`), repetido no dia ~30 e ~90 |
| Instagram | Impressões de postagens na Pesquisa Google | Search Console (propriedade do Instagram) |

## 22. Top 10 ações imediatas

| # | Ação | Por quê | Evidência | Propósito esperado | Esforço | Dependências |
|---|---|---|---|---|---|---|
| 1 | Revisar o Google Business Profile | Ativo local mais forte; alimenta "perto de mim" | `05`, `09` | Visibilidade local | S | Dono |
| 2 | Decidir e corrigir o `aggregateRating` | Dado fixo pode ficar desatualizado | `02` HIGH nº 1 | Evitar marcação enganosa | S | Dev + dono |
| 3 | Adicionar `FAQPage` em `/servicos` | FAQ real sem marcação | `02` HIGH nº 2 | Citabilidade por máquinas | S | Dev |
| 4 | Criar `/servicos/microlocs` e as outras 3 páginas prioritárias | Serviços só como âncoras | `02` nº 6, `03` | URLs indexáveis por serviço | M | Dev + material do dono |
| 5 | Publicar o guia de Microlocs e "Microlocs vs dreads" | Campo vazio em pt-BR | `05`, `06`, `07` | Ser a fonte de referência | M | Método, fotos e vídeos do dono |
| 6 | Publicar `/sobre` com Lyon e Thay | Pessoas ausentes | `08` | Entidade e confiança | S–M | Dados que o dono queira publicar |
| 7 | Cadastrar no Fresha e GetNinjas; pedir inclusão no dread.com.br | Fontes que as buscas de IA citam | `04`, `07` | Presença externa | S | Decisão do dono |
| 8 | Publicar os guias de objeção (preço, dano, tranças) | Objeções reais e SERP fraca | `07` Prompts 5–7 | Reduzir atrito, ganhar citações | M | Dono |
| 9 | Publicar `/como-agendar` e "Onde estamos" | Reduz fricção e reforça o local | `09`, `01` | Conversão e local | S | Dev + dono |
| 10 | Rodar `geo-prompt-tests.md` e o PageSpeed Insights | Sem linha de base não há como medir | `07`, `02` | Linha de base de GEO e performance real | S | Dono |

---

## Checklist de Quality Control (Agente 16)

Auditoria feita em 29/09/2026 sobre todos os arquivos da estratégia.

- [x] **Sem dados fabricados** — volumes marcados NÃO VERIFICADO; nenhum preço, tráfego ou ranking de concorrente foi inventado; a nota 5,0/56 vem do site e do Google (INFORMADO/FATO no código).
- [x] **Sem afirmações sem suporte** — ajustadas 2 durante o QC: a afirmação sobre rich results de FAQ virou INFERÊNCIA a verificar (`14-structured-data.md`); a frase "nenhum concorrente comunica a cultura afro" foi suavizada e sustentada por evidência (`08-entities.md`).
- [x] **Sem keywords duplicadas** — `microdreads` tratada como sinônimo dentro do guia e da página de Microlocs, sem página própria.
- [x] **Sem canibalização evidente** — tabela de conflitos de intenção em `10-clusters.md`; "Primeira aplicação" consolidada numa URL.
- [x] **Sem páginas de localização duplicadas** — nenhuma página por bairro (`09-local.md`).
- [x] **Sem afirmações não suportadas sobre concorrentes** — todas com FATO VERIFICADO/INFERÊNCIA. **Ressalva:** endereço do Estúdio Baroni diverge entre `04` e `07`; não foi usado.
- [x] **Intenção de busca definida** — em briefs, clusters e plano.
- [x] **Relevância de negócio definida** — coluna em prioridades e clusters.
- [x] **Relevância GEO definida** — idem.
- [x] **Entidades identificadas** — `08-entities.md`.
- [x] **Links internos considerados** — `13-internal-linking.md`.
- [x] **SEO técnico considerado** — `02-technical.md`.
- [x] **Arquitetura de conteúdo coerente** — `11-architecture.md`; ver a dúvida sobre Start Locs × "Retwist + Twist" abaixo.
- [x] **Prioridades com justificativa** — coluna "Razão / evidência".
- [x] **Fontes citadas** — cada afirmação aponta para arquivo ou evidência; log em `00-evidence-log.md`.
- [x] **Incerteza declarada** — bloco "Limites desta análise" no topo.
- [x] **Recomendações acionáveis** — briefs, plano de links, schema, roadmap.
- [x] **Fatos do dono rotulados** — INFORMADO PELO CLIENTE nos arquivos de negócio, local e briefs.

**Pendências abertas (não bloqueiam, mas precisam de decisão):**
1. Start Locs × "Retwist + Twist": o contexto original tratava "Retwist + Twist" como manutenção; o site chama esse serviço de "Start Locs" (slug `retwist-twist`). Confirmar se são o mesmo serviço antes de criar a URL.
2. Avaliações no schema (`aggregateRating`): checar a diretriz vigente do Google antes de decidir manter ou remover.
3. Os briefs dependem de material que só o dono tem (métodos, fotos/vídeos, dados, autorizações de clientes).
4. Endereço do Estúdio Baroni diverge entre os arquivos das Fases 4 e 7.
5. Teste manual de IA e PageSpeed Insights ainda não realizados.
