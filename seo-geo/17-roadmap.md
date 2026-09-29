# Fase 16–17 — Roadmap de 90 dias

"Dia 1" = a data em que o dono aprovar o plano. Nenhuma meta numérica de tráfego: não há baseline (o Search Console só começou a coletar em 26/09/2026) e volumes de busca são NÃO VERIFICADOS. As metas abaixo são de **entrega**, não de resultado.
Legenda: RECOMENDAÇÃO (tudo neste arquivo), com base nas fases anteriores.

## Dias 1–30 — Fundação técnica, ganhos rápidos, páginas comerciais

| Semana | Entrega | Origem | Responsável |
|---|---|---|---|
| 1 | Revisar o Google Business Profile: categorias, serviços, horário igual ao do site, fotos, respostas a avaliações; começar a pedir avaliação detalhada após cada atendimento | `09-local.md` | Dono |
| 1 | Decidir o destino do `aggregateRating` e trocar `image` do JSON-LD por foto real | `14-structured-data.md`, Fase 2 HIGH nº 1 | Dev + dono |
| 1 | Adicionar `FAQPage` em `/servicos` (gerado a partir de `FAQ_ITEMS`) | Fase 2 HIGH nº 2 | Dev |
| 1 | Conferir o Search Console: propriedade do site e do Instagram @afrodreads_ (o Google avisou por e-mail que ambas começaram a coletar em 26/09/2026); enviar o `sitemap.xml` se ainda não foi enviado | GSC | Dono |
| 1–2 | Cadastro no Fresha e GetNinjas; pedido de inclusão no dread.com.br | `07-geo.md` | Dono |
| 2 | Coletar do dono: texto do método de cada serviço, fotos e vídeos com autorização, dados de Lyon e Thay para `/sobre` (checklist E-E-A-T dos briefs) | Briefs | Dono |
| 2–3 | Publicar `/servicos/microlocs`, `/servicos/revitalizacao`, `/servicos/retwist`, `/servicos/primeira-aplicacao` (uma URL cada, com FAQ, duração, fotos/vídeos reais) | `11-architecture.md` | Dev + dono |
| 3 | Publicar `/sobre` (brief 3) e `/como-agendar` | Briefs | Dev + dono |
| 3–4 | Seção "Onde estamos / como chegar" na home e em `/contato` | `09-local.md` | Dev + dono |
| 4 | Atualizar `sitemap.ts`, `llms.txt`, Header/Footer e links da home para as novas URLs | `13-internal-linking.md` | Dev |
| 4 | **Rodar a planilha de testes de IA** (`geo-prompt-tests.md`) e registrar a linha de base manual | `07-geo.md` | Dono |
| 4 | Rodar o PageSpeed Insights (home, `/servicos`, `/portfolio`) e registrar LCP/CLS/INP reais; só então decidir sobre fontes e cache | Fase 2 MEDIUM nº 4 e nº 5 | Dono/dev |

## Dias 31–60 — Conteúdo pilar, links internos, ativos de GEO, autoridade

| Entrega | Origem |
|---|---|
| Publicar `/servicos/cultivo-agulhado`, `/servicos/start-locs`, `/servicos/short-dread` | Briefs 7 e 8 |
| Publicar os guias de prioridade ALTA: Microlocs (pilar), Microlocs vs dreads, Quanto custa fazer dreads, Dread danifica o cabelo, Dreads vs tranças | Briefs 1, 2, 4, 5, 6 |
| Aplicar o plano de links internos (todos os "De → Para" da Fase 13) | `13-internal-linking.md` |
| Adicionar schema `Service`, `Article`, `BreadcrumbList`, `Person`, `VideoObject` conforme o plano e validar no Rich Results Test | `14-structured-data.md` |
| Portfólio com texto descritivo por trabalho e links para cada serviço | `03-inventory.md` |
| Autoridade: primeiros pedidos de menção (parceiros, comunidade, imprensa de nicho, influenciadores com autorização), consistência de nome/telefone/horário em todas as plataformas | `07-geo.md`, `08-entities.md` |
| Revisar Search Console: consultas, páginas indexadas, cobertura das novas URLs | GSC |

## Dias 61–90 — Expansão, comparações, cauda longa, refresh, iteração de GEO

| Entrega | Origem |
|---|---|
| Pilares "Como fazer dreads pela primeira vez", "Manutenção/retwist", "Revitalização" e artigos de apoio (tempo de duração, como lavar, como cuidar, alopecia por tração, cabelo curto) | `11-architecture.md` itens 14–23 |
| Refresh dos primeiros artigos com base nas consultas reais do Search Console | GSC |
| Conteúdo de dados próprios: por exemplo, "quanto dura cada sessão por serviço" com base na agenda real (só se o dono quiser publicar) | `11-architecture.md` |
| Segunda rodada do teste manual de prompts de IA; comparar com a linha de base do dia ~30 | `geo-prompt-tests.md` |
| Avaliar `/servicos/penteados`, glossário, tipos de dreads e natural vs sintético | Prioridade BAIXA |
| Reavaliar o plano com dados reais: exportar consultas do Search Console para `seo-geo/inputs/` e refazer a pesquisa de palavras-chave com volumes reais | Fase 5 |

## Marcos de controle

| Quando | Verificar |
|---|---|
| Dia 30 | Páginas de serviço e Sobre publicadas e indexadas? Schema válido? GBP revisado? Linha de base de IA registrada? |
| Dia 60 | Guias de prioridade ALTA publicados? Links internos aplicados? Primeiras impressões e consultas novas no Search Console? |
| Dia 90 | Comparar impressões/cliques/consultas com a série do Search Console desde 26/09/2026; comparar a segunda rodada de prompts de IA com a linha de base |
