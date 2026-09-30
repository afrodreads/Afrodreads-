# Fase 13 — Plano de Links Internos (Agente 13)

Base: `11-architecture.md`, `10-clusters.md`. Todas as URLs futuras são **RECOMENDAÇÃO**. Âncoras naturais, sem "exact match" forçado.
Situação atual (FATO VERIFICADO, `03-inventory.md`): só 4 páginas públicas; Header/Footer ligam as 4; os 9 serviços são âncoras em `/servicos`; não há blog.

## 1. Regras gerais

1. Toda página de serviço linka para: o guia do cluster, 1–2 artigos de apoio, `/como-agendar` e o CTA de WhatsApp.
2. Todo guia linka para: a página de serviço do cluster (CTA principal), o pilar do cluster e 1–2 artigos irmãos.
3. Todo artigo de objeção (preço, dano, tranças) linka para o serviço que resolve a dúvida.
4. `/sobre` recebe link do Header/Footer, da home e de cada página de serviço ("quem faz").
5. Máximo de ~3–5 links contextuais por texto de 1.500 palavras; sem blocos de links repetidos.
6. Âncoras descritivas em português natural ("veja como funciona a revitalização"), não "clique aqui".

## 2. Mapa principal (De → Para)

| De | Para | Âncora sugerida | Contexto | Propósito |
|---|---|---|---|---|
| Home (seção Serviços) | `/servicos/microlocs` | "Microlocs" (no card) | Cards de serviço | Descoberta / distribuir autoridade |
| Home (seção Serviços) | `/servicos/[cada serviço]` | nome do serviço | Cards (hoje só levam a `/servicos#slug`) | Trocar âncora por URL própria |
| Home (novo bloco) | `/sobre` | "Conheça Lyon e Thay" | Após a seção de avaliações | Entidade/E-E-A-T |
| `/servicos` (hub) | as 7–8 páginas de serviço | nome do serviço + "saiba mais" | Cada card | Hub → filhas |
| `/servicos/microlocs` | `/blog/microlocs-o-que-sao-como-funcionam` | "entenda como funcionam os microlocs" | Após a descrição do serviço | Comercial → informacional (autoridade) |
| `/servicos/microlocs` | `/blog/microlocs-vs-dreads` | "diferença entre microlocs e dreads" | Seção "qual escolher" | Apoio |
| `/servicos/microlocs` | `/como-agendar` | "como funciona o orçamento" | FAQ/CTA | Conversão |
| `/blog/microlocs-o-que-sao-como-funcionam` | `/servicos/microlocs` | "fazer microlocs em Pirituba" | Fim da introdução e CTA final | Informacional → comercial |
| `/blog/microlocs-o-que-sao-como-funcionam` | `/blog/microlocs-vs-dreads` | "microlocs ou dreads?" | Seção comparação | Irmão |
| `/blog/microlocs-o-que-sao-como-funcionam` | `/blog/quanto-custa-microlocs-o-que-define-o-preco` | "o que define o preço" | Seção preço | Irmão |
| `/blog/microlocs-vs-dreads` | `/servicos/primeira-aplicacao` | "dreads tradicionais" | Comparativo | Cross-cluster |
| `/blog/microlocs-vs-dreads` | `/servicos/microlocs` | "microlocs" | Comparativo | Comercial |
| `/blog/dread-danifica-o-cabelo` | `/servicos/revitalizacao` | "revitalização de dreads" | Seção "já tenho dreads" | Objeção → serviço |
| `/blog/dread-danifica-o-cabelo` | `/blog/manutencao-de-dreads-retwist` | "manutenção correta" | Cuidados | Apoio |
| `/blog/dread-danifica-o-cabelo` | `/blog/alopecia-por-tracao-e-dreads` | "alopecia por tração" | Seção de saúde | Irmão |
| `/blog/dreads-vs-trancas` | `/servicos/primeira-aplicacao` | "primeira aplicação de dreads" | Seção "quando escolher dreads" | Educação → serviço |
| `/blog/dreads-vs-trancas` | `/blog/como-fazer-dreads-primeira-vez` | "o que saber antes de fazer dreads" | Fim | Pilar |
| `/blog/quanto-custa-fazer-dreads-sp` | `/como-agendar` | "como funciona o orçamento e o sinal" | Meio do texto | Preço → processo |
| `/blog/quanto-custa-fazer-dreads-sp` | `/contato` | "peça seu orçamento" | CTA | Conversão |
| `/blog/quanto-custa-fazer-dreads-sp` | `/blog/quanto-custa-microlocs-o-que-define-o-preco` | "preço dos microlocs" | Menção a microlocs | Irmão |
| `/blog/como-fazer-dreads-primeira-vez` (pilar) | `/blog/dreads-vs-trancas`, `/blog/quanto-tempo-dura-fazer-dreads`, `/blog/dread-danifica-o-cabelo`, `/blog/tipos-de-dreads-e-metodos` | descritivas | Índice do pilar | Pilar → apoio |
| Artigos de apoio do cluster 3 | `/blog/como-fazer-dreads-primeira-vez` | "guia para quem vai fazer pela primeira vez" | Fim | Apoio → pilar |
| `/servicos/retwist` | `/blog/manutencao-de-dreads-retwist`, `/blog/como-lavar-dreads` | "quando fazer o retwist", "como lavar" | Cuidados | Comercial → apoio |
| `/servicos/revitalizacao` | `/blog/dread-danifica-o-cabelo`, `/blog/revitalizacao-de-dreads` | "quando revitalizar" | Seção "vim de outro salão" | Comercial → apoio |
| `/servicos/cultivo-agulhado` | `/servicos/primeira-aplicacao`, `/blog/tipos-de-dreads-e-metodos` | "outras opções de método" | Comparativo | Cross-sell |
| `/servicos/start-locs` | `/servicos/retwist` | "manutenção do retwist" | Pós-serviço | Cross-sell |
| `/servicos/short-dread` | `/blog/dread-cabelo-curto-short-dread` | "dread em cabelo curto" | Dúvida frequente | Apoio |
| `/portfolio` | página de serviço correspondente a cada foto/vídeo | nome do serviço | Legenda de cada trabalho | Prova social → serviço |
| `/como-agendar` | `/contato` e `/servicos` | "falar no WhatsApp" | Fim | Conversão |
| `/sobre` | todas as páginas de serviço, `/contato`, Google Business Profile | nomes dos serviços | Seção "o que fazemos" | Entidade |
| `/contato` | `/como-agendar`, `/sobre` | "como funciona o agendamento" | Ao lado do formulário | Reduz fricção |
| Footer (global) | `/servicos`, `/portfolio`, `/blog`, `/sobre`, `/como-agendar`, `/contato` | nome da seção | Rodapé | Rastreabilidade |
| Header (global) | `/servicos`, `/portfolio`, `/blog`, `/sobre`, `/contato` | nome da seção | Navegação | Rastreabilidade |

## 3. Cuidados

- **Âncoras `#slug` atuais** (ex.: `/servicos#retwist-twist`): manter funcionando ou redirecionar para a nova URL, porque `llms.txt` e o JSON-LD apontam para elas (`src/lib/seo.ts`).
- **Canonical** em todas as novas páginas (padrão já usado nas 4 existentes).
- Ao criar as páginas, atualizar `sitemap.ts` (hoje só 4 rotas) e `llms.txt` (gerado a partir de `SERVICES` + lista de páginas).
- **Órfãs:** verificar no Search Console (Páginas → Descoberta) após a publicação.
