# Fase 3 — Inventário de Conteúdo (Agente 3)

Site: https://www.afrodreads.com.br/
Fonte primária: código-fonte do repositório (`src/app/`, `src/components/`, `src/lib/`), sitemap.xml (4 URLs), HTML ao vivo.
Legenda: **FATO VERIFICADO** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

---

## Inventário de páginas públicas (indexáveis)

O sitemap.xml contém exatamente **4 URLs**. Não há blog, guias, glossário, comparações, case studies, páginas por serviço individual, nem páginas locais. **FATO VERIFICADO** (`src/app/sitemap.ts`).

| URL | Title | H1 | Tipo | Tópico primário | Keyword primária | Intenção | Funil | Valor comercial | Qualidade | Entidades | Cluster | Relevância local | Valor GEO | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Dreadlocks e Microlocs em Pirituba, SP \| Afro Dreads | VEM FICAR NO ESTILO COM A GENTE. | Homepage | Apresentação do estúdio | dreadlocks pirituba sp | Navegacional / Comercial | Topo/Meio | ALTO | BOA — hero com vídeo, roteador por momento (primeira vez / manutenção / revitalização), carrossel de serviços, antes/depois, avaliações Google, localização, CTA WhatsApp | Afro Dreads, dreadlocks, microlocs, Pirituba, SP | — | ALTA | MÉDIO (sem schema FAQPage, sem conteúdo textual longo para citação) | ✅ Ativa |
| `/servicos` | Serviços de Dreadlocks e Microlocs \| Afro Dreads Pirituba | Encontre o serviço ideal | Service listing | Todos os serviços | serviços dreadlocks sp | Comercial / Informacional | Meio | ALTO | BOA — lista dos 9 serviços com duração, FAQ de 9 perguntas reais, regras de sinal/cancelamento, CTA WhatsApp. FAQ renderizado em `<details>/<summary>` no HTML (acessível sem JS). Falta: schema FAQPage, páginas individuais por serviço | Afro Dreads, dreads, microlocs, retwist, revitalização, penteados, start locs, short dread, cultivo agulhado | Dreadlocks (pilar) | ALTA | ALTO (FAQ é ouro para GEO — perguntas reais com respostas reais, mas sem marcação estruturada) | ✅ Ativa |
| `/portfolio` | Portfólio de Dreadlocks e Microlocs \| Afro Dreads Pirituba | Quem já ficou no estilo, aprova. 🔥 | Portfolio / Galeria | Trabalhos realizados | portfolio dreads sp | Comercial (prova social) | Fundo | ALTO | BOA — antes/depois com slider, galeria com filtro por serviço (fotos + vídeos), 3 depoimentos do Google. Falta: mais depoimentos, texto descritivo para crawlers (as imagens são a estrela, mas bots leem texto) | Afro Dreads, dreads, microlocs, revitalização | Portfólio | MÉDIA | BAIXO (conteúdo visual, pouco texto citável) | ✅ Ativa |
| `/contato` | Contato \| Agende seu Horário — Afro Dreads Pirituba | Seu próximo visual começa aqui. | Contato / Conversão | Como agendar | contato afro dreads | Transacional | Fundo | ALTO | BOA — WhatsApp, Instagram, link Google Maps, formulário de contato. Sem endereço completo (decisão do dono, correto). | Afro Dreads, Pirituba, WhatsApp | — | ALTA | BAIXO (página de conversão, não de conteúdo citável) | ✅ Ativa |

## Páginas auxiliares (não indexáveis / transacionais)

| URL pattern | Tipo | Indexável | Notas |
|---|---|---|---|
| `/agendamento` | Fluxo de agendamento | NÃO (`Disallow` em robots.txt) | Formulário de agendamento |
| `/agendamento/[bookingId]/sucesso` | Status de booking | NÃO (`robots: { index: false }`) | Página de confirmação |
| `/agendamento/[bookingId]/pendente` | Status de booking | NÃO | Pagamento pendente |
| `/agendamento/[bookingId]/erro` | Status de booking | NÃO | Erro no pagamento |
| `/checkout/[bookingId]` | Checkout (Mercado Pago) | NÃO | Pagamento do sinal |
| `/orcamento/[token]` | Orçamento | NÃO | Link único por orçamento |
| `/admin/*` | Painel admin | NÃO | 4 sub-rotas (login, serviços, bloqueios, orçamentos) |
| `/api/*` | API routes | NÃO | 14 rotas de API (CRUD serviços, bookings, pagamento, webhook) |

## Recursos especiais (SEO/GEO)

| Recurso | URL | Tipo | Status | Notas |
|---|---|---|---|---|
| robots.txt | `/robots.txt` | Crawl control | ✅ | Permite `*` + 11 bots de IA nomeados; bloqueia áreas privadas |
| sitemap.xml | `/sitemap.xml` | Indexação | ✅ | 4 URLs; `lastModified` = data do build (não da mudança real) |
| llms.txt | `/llms.txt` | GEO / IA | ✅ | Texto plano com resumo do negócio, serviços e links — excelente para citação por IAs |
| JSON-LD | Injetado no `<head>` (layout raiz) | Schema.org | ✅ | `HairSalon` com `OfferCatalog`, `OpeningHoursSpecification`, `sameAs`, `aggregateRating` (fixo) |
| Open Graph | Todas as 4 páginas | Social sharing | ✅ | Imagem OG dinâmica 1200×630 via `next/og` |

---

## Análise qualitativa

### Páginas fortes
- **Homepage** — boa primeira impressão, hero com vídeo, roteador de jornada, prova social (avaliações), CTA claro. Cumpre bem o papel de porta de entrada.
- **Serviços** — informação real (9 serviços, durações, FAQ), renderizada em HTML puro (SSR). É a página com maior potencial SEO/GEO do site hoje.
- **llms.txt** — iniciativa rara e inteligente; coloca o negócio visível para sistemas de IA de forma estruturada.

### Páginas fracas / gaps
- **Portfolio** — visualmente forte, mas com pouco texto descritivo para crawlers. Poderia ter contexto por trabalho (tipo de serviço, textura do cabelo, duração, resultado).
- **Contato** — cumpre o papel de conversão, mas sem conteúdo informacional (poderia ter mapa de área de atendimento, horários detalhados).

### Conteúdo ausente (missing pages) — oportunidades

| Página que deveria existir | Tipo | Intenção | Justificativa |
|---|---|---|---|
| `/servicos/[slug]` (9 páginas individuais) | Service detail | Comercial + Informacional | Cada serviço tem buscas próprias ("microlocs o que é", "retwist dreads", "cultivo agulhado"). Hoje são apenas âncoras dentro de `/servicos`, sem URL indexável própria. **RECOMENDAÇÃO** |
| Página "Sobre" / "Quem somos" | About | Navegacional / E-E-A-T | Lyon e Thay não têm bios no site. Para Entity SEO e E-E-A-T (experiência, expertise), uma página sobre os fundadores com fotos, trajetória e credenciais seria valiosa. **RECOMENDAÇÃO** |
| Blog / conteúdo informacional | Blog / Guide | Informacional | Zero conteúdo informacional indexável. As perguntas do FAQ (`/servicos`) são um excelente ponto de partida, mas cada uma poderia ser um artigo completo: "Dread danifica o cabelo?", "Diferença entre dreads e tranças", "Quanto custa fazer dreads em SP". **RECOMENDAÇÃO** |
| Páginas de comparação | Comparison | Informacional | "Microlocs vs dreads normais", "Retwist vs revitalização", "Dreads sintéticos vs naturais". **RECOMENDAÇÃO** |
| Página de depoimentos / avaliações | Reviews / Social proof | Comercial | Os 5 depoimentos estão espalhados entre home e portfolio. Uma página dedicada com todos os depoimentos do Google aumentaria E-E-A-T e citabilidade. **INFERÊNCIA** |
| FAQ expandido / Glossário | FAQ / Glossary | Informacional | As 9 perguntas atuais são boas, mas superficiais. Termos como "interlock", "crochet", "twist and rip", "método agulhado", "locs vs dreads" merecem explicação. **RECOMENDAÇÃO** |

### Conteúdo duplicado / canibalização
- **Não há canibalização** — com apenas 4 páginas públicas, cada uma tem escopo claramente distinto. **FATO VERIFICADO**.
- **Risco futuro**: se as páginas individuais de serviço forem criadas sem planejamento de intent, `/servicos` (listagem) pode canibalizar `/servicos/microlocs` (detalhe). A arquitetura de conteúdo (Fase 11) deve tratar isso.

### Conteúdo para consolidar / expandir / atualizar
- **Expandir**: FAQ de `/servicos` → artigos individuais no blog
- **Expandir**: Portfolio → adicionar texto descritivo por trabalho
- **Atualizar**: `aggregateRating` no JSON-LD (fixo em 5,0/56 — já flaggeado na Fase 2)
- **Expandir**: Home → seção "Sobre os fundadores" ou link para página About

### Páginas órfãs
- Nenhuma página órfã identificada. As 4 páginas públicas são linkadas no Header e Footer (`src/components/layout/Header.tsx`, `Footer.tsx`). **FATO VERIFICADO**.

---

## Resumo quantitativo

| Métrica | Valor |
|---|---|
| Total de URLs no sitemap | 4 |
| Páginas públicas indexáveis | 4 |
| Páginas transacionais (noindex) | ~8 patterns |
| API routes | 14 |
| Recursos SEO/GEO (robots, sitemap, llms.txt, schema) | 4 |
| Blog posts / artigos | **0** |
| Páginas individuais de serviço | **0** (9 serviços como âncoras em 1 página) |
| Páginas "Sobre" / bios | **0** |
| Páginas de comparação | **0** |
| Glossário / termos | **0** |
| Páginas locais dedicadas | **0** |

**Conclusão**: o site é bem construído tecnicamente, mas tem uma **superfície de conteúdo indexável extremamente pequena** (4 páginas). Para crescer organicamente (SEO) e ser citado por IAs (GEO), precisa de uma expansão significativa de conteúdo — começando por páginas individuais de serviço e conteúdo informacional baseado nas dúvidas reais dos clientes. As Fases 10–15 (clusters, arquitetura, briefs, linking, schema) devem resolver isso.
