# Fases 11–12 — Arquitetura de Conteúdo e Plano de Conteúdo (Agente 11)

Base: `03-inventory.md` (hoje 4 páginas indexáveis, 0 blog, 0 páginas de serviço) e `10-clusters.md`.
Legenda: **FATO VERIFICADO** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.
Toda URL abaixo é **RECOMENDAÇÃO** (não existe ainda). Volumes: NÃO VERIFICADO.

## 1. Árvore de conteúdo

```
/  (home — já existe)
├─ /servicos  (hub — já existe; manter lista + FAQ geral)
│   ├─ /servicos/primeira-aplicacao   (topo + cabeça toda)
│   ├─ /servicos/microlocs
│   ├─ /servicos/retwist
│   ├─ /servicos/revitalizacao
│   ├─ /servicos/start-locs
│   ├─ /servicos/short-dread
│   ├─ /servicos/cultivo-agulhado
│   └─ /servicos/penteados            (fase 3; baixa prioridade)
├─ /blog  (hub de guias)
│   ├─ Cluster 1 · microlocs-o-que-sao-como-funcionam  (PILAR)
│   │     ├─ microlocs-vs-dreads
│   │     └─ quanto-custa-microlocs-o-que-define-o-preco
│   ├─ Cluster 2 · cultivo-agulhado-o-que-e · start-locs-o-que-e · dread-cabelo-curto-short-dread
│   ├─ Cluster 3 · como-fazer-dreads-primeira-vez  (PILAR)
│   │     ├─ dreads-vs-trancas
│   │     ├─ quanto-tempo-dura-fazer-dreads
│   │     ├─ tipos-de-dreads-e-metodos
│   │     └─ dread-natural-vs-sintetico
│   ├─ Cluster 4 · manutencao-de-dreads-retwist  (PILAR)
│   │     ├─ como-lavar-dreads
│   │     └─ como-cuidar-de-dreads
│   ├─ Cluster 5 · revitalizacao-de-dreads  (PILAR)
│   │     ├─ dread-danifica-o-cabelo
│   │     └─ alopecia-por-tracao-e-dreads
│   └─ Cluster 6 · quanto-custa-fazer-dreads-sp  (fatores, sem valores)
├─ /portfolio  (já existe; adicionar texto descritivo por trabalho)
├─ /sobre  (nova — Lyon e Thay, entidade, cultura, o que fazemos e não fazemos)
├─ /como-agendar  (nova — orçamento por avaliação, sinal, cancelamento, o que enviar)
└─ /contato  (já existe; adicionar "Onde estamos / como chegar")
```

Sem páginas por bairro, sem "perto de mim", sem tabela de preços (`09-local.md`, decisão do dono).

## 2. Páginas novas e existentes

| URL | Título sugerido (≤ 60 caracteres) | Keyword primária | Secundárias | Intenção | Cluster | Pai | Filhos | Papel comercial | Papel GEO |
|---|---|---|---|---|---|---|---|---|---|
| `/servicos/microlocs` | Microlocs em Pirituba, SP \| Afro Dreads | microlocs | microdreads, microlocs sp | Comercial | 1 | /servicos | — | Alto | Definição curta + duração + FAQ citáveis |
| `/servicos/primeira-aplicacao` | Primeira Aplicação de Dreads em Pirituba, SP | fazer dreads sp | primeira aplicação dreads, dread topo, cabeça toda | Comercial | 3 | /servicos | — | Alto | Como funciona a sessão |
| `/servicos/retwist` | Retwist e Manutenção de Dreads em SP | retwist dreads | manutenção de dreads sp | Comercial | 4 | /servicos | — | Alto (recorrente) | O que é/quando fazer |
| `/servicos/revitalizacao` | Revitalização de Dreads em Pirituba, SP | revitalização de dreads | recuperar dreads, dreads de outro salão | Comercial | 5 | /servicos | — | Alto | Antes/depois com texto |
| `/servicos/start-locs` | Start Locs em Pirituba, SP \| Afro Dreads | start locs | início de locs cabelo natural | Comercial | 2 | /servicos | — | Médio | Definição em pt-BR (campo vazio) |
| `/servicos/short-dread` | Short Dread (Dread Curto) em São Paulo | short dread | dread cabelo curto | Comercial | 2 | /servicos | — | Médio | Responde "dá para fazer em cabelo curto?" |
| `/servicos/cultivo-agulhado` | Cultivo Agulhado: Dreads Só com Seu Cabelo | cultivo agulhado dreadlocks | dread de agulha, dreads sem extensão | Comercial | 2 | /servicos | — | Médio | Definição em pt-BR (campo vazio) |
| `/servicos/penteados` | Penteados em Dreads e Microlocs | penteados para dreads | — | Comercial | 4 | /servicos | — | Baixo | Baixo |
| `/sobre` | Sobre a Afro Dreads: Lyon e Thay | afro dreads (marca) | quem faz dreads pirituba | Navegacional / E-E-A-T | 6 | / | — | Confiança | Entidade pessoa + local + cultura |
| `/como-agendar` | Como Agendar Dreads: Orçamento, Sinal e Cancelamento | agendar dreads pirituba | quanto custa dreads, sinal | Transacional/Info | 6 | /contato | — | Alto (reduz fricção) | Processo claro e verificável |
| `/blog/...` (16 artigos) | ver `12-content-plan` abaixo | ver abaixo | — | Informacional | 1–6 | /blog | — | Apoio | Fonte citável |

**Cannibalization check (Agente 11):** cada intenção tem uma só página; as páginas de serviço (comerciais) e os guias (informacionais) se ligam mas não repetem o texto (`10-clusters.md`, tabela de conflitos).

## 3. Plano de conteúdo (ordem de execução)

Prioridade: **ALTA** = alto valor comercial e/ou GEO e baixa concorrência; **MÉDIA** = suporte; **BAIXA** = fase 3.
Tipo: Serv = página de serviço · Guia = artigo informacional · Inst = institucional.

| # | Título | Keyword | Intenção | Tipo | Cluster | URL | Prioridade | Papel SEO | Papel GEO | Brief |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Microlocs em Pirituba, SP | microlocs | Comercial | Serv | 1 | /servicos/microlocs | ALTA | Página comercial do serviço premium | Resposta curta + FAQ | — (usa brief 1) |
| 2 | Microlocs: o que são, como funcionam e o que define o preço | microlocs | Informacional | Guia (pilar) | 1 | /blog/microlocs-o-que-sao-como-funcionam | ALTA | Ocupa campo vazio pt-BR | Fonte de referência | `briefs/microlocs-guia.md` |
| 3 | Microlocs vs dreads: qual a diferença? | microlocs vs dreads | Informacional | Guia | 1 | /blog/microlocs-vs-dreads | ALTA | Zero resultado pt-BR | Comparativo citável | `briefs/microlocs-vs-dreads.md` |
| 4 | Sobre a Afro Dreads | marca | Navegacional | Inst | 6 | /sobre | ALTA | Entidade/E-E-A-T | Pessoa + local + cultura | `briefs/sobre.md` |
| 5 | Quanto custa fazer dreads? O que define o preço | quanto custa fazer dreads | Comercial/Info | Guia | 6 | /blog/quanto-custa-fazer-dreads-sp | ALTA | Objeção nº 1 (preço) | Explica sem inventar valores | `briefs/quanto-custa-fazer-dreads.md` |
| 6 | Dread danifica o cabelo? | dread danifica o cabelo | Informacional | Guia | 5 | /blog/dread-danifica-o-cabelo | ALTA | Objeção principal | Resposta de profissional + fotos | `briefs/dread-danifica-o-cabelo.md` |
| 7 | Diferença entre dreads e tranças | diferença entre dreads e tranças | Informacional | Guia | 3 | /blog/dreads-vs-trancas | ALTA | SERP fraca | Dissipa confusão recorrente | `briefs/dreads-vs-trancas.md` |
| 8 | Cultivo agulhado: o que é | cultivo agulhado dreadlocks | Informacional | Guia + Serv | 2 | /servicos/cultivo-agulhado + /blog/... | ALTA | Zero conteúdo escrito | Definição citável | `briefs/cultivo-agulhado.md` |
| 9 | Start locs: o que é | start locs | Informacional | Guia + Serv | 2 | /servicos/start-locs + /blog/... | ALTA | Quase só inglês | Definição pt-BR | `briefs/start-locs.md` |
| 10 | Primeira aplicação de dreads | fazer dreads sp | Comercial | Serv | 3 | /servicos/primeira-aplicacao | ALTA | Página comercial local | Como é a sessão | — |
| 11 | Revitalização de dreads | revitalização de dreads | Comercial | Serv | 5 | /servicos/revitalizacao | ALTA | Página comercial | "Vim de outro salão" | — |
| 12 | Retwist e manutenção de dreads | retwist dreads | Comercial | Serv | 4 | /servicos/retwist | ALTA | Receita recorrente | O que é/quando | — |
| 13 | Como agendar: orçamento, sinal e cancelamento | agendar dreads pirituba | Transacional | Inst | 6 | /como-agendar | ALTA | Reduz fricção | Processo verificável | — |
| 14 | Como fazer dreads pela primeira vez | o que saber antes de fazer dreads | Informacional | Guia (pilar) | 3 | /blog/como-fazer-dreads-primeira-vez | MÉDIA | Topo de funil | Guia completo | — |
| 15 | Quanto tempo dura fazer dreads | quanto tempo dura fazer dreads | Informacional | Guia | 3 | /blog/quanto-tempo-dura-fazer-dreads | MÉDIA | Objeção de tempo; usa durações reais 2–12 h | Dados próprios citáveis | — |
| 16 | Manutenção de dreads: retwist | manutenção de dreads sp | Informacional | Guia (pilar) | 4 | /blog/manutencao-de-dreads-retwist | MÉDIA | Autoridade | Guia | — |
| 17 | Revitalização de dreads: quando fazer | revitalização de dreads | Informacional | Guia (pilar) | 5 | /blog/revitalizacao-de-dreads | MÉDIA | Autoridade | Guia | — |
| 18 | Dread em cabelo curto / Short dread | dread cabelo curto | Informacional | Guia | 2 | /blog/dread-cabelo-curto-short-dread | MÉDIA | Dúvida frequente | Resposta direta | — |
| 19 | Short dread | short dread | Comercial | Serv | 2 | /servicos/short-dread | MÉDIA | — | — | — |
| 20 | Quanto custa microlocs | microlocs preço | Comercial/Info | Guia | 1 | /blog/quanto-custa-microlocs-o-que-define-o-preco | MÉDIA | Alta intenção | Fatores | — |
| 21 | Como lavar dreads | como lavar dreads | Informacional | Guia | 4 | /blog/como-lavar-dreads | MÉDIA | Retenção | Prático | — |
| 22 | Como cuidar de dreads | como cuidar de dreads | Informacional | Guia | 4 | /blog/como-cuidar-de-dreads | MÉDIA | Retenção | Prático | — |
| 23 | Alopecia por tração e dreads | alopecia tração dreads | Informacional | Guia | 5 | /blog/alopecia-por-tracao-e-dreads | MÉDIA | Objeção de saúde | Exige revisão do dono | — |
| 24 | Portfólio com texto por trabalho | dreads antes e depois | Comercial | Refresh | 6 | /portfolio | MÉDIA | Provas | Contexto textual | — |
| 25 | Tipos de dreads e métodos | tipos de dreads | Informacional | Guia | 3 | /blog/tipos-de-dreads-e-metodos | BAIXA | Topo | — | — |
| 26 | Dread natural vs sintético | dread natural vs sintético | Informacional | Guia | 3 | /blog/dread-natural-vs-sintetico | BAIXA | Topo | — | — |
| 27 | Penteados em dreads | penteados para dreads | Comercial | Serv | 4 | /servicos/penteados | BAIXA | — | — | — |
| 28 | Glossário de dreads | (vários) | Informacional | Glossário | 3 | /blog/glossario | BAIXA | Long tail | Definições | — |

**Observação de implementação (RECOMENDAÇÃO):** o site é Next.js. `AGENTS.md` avisa que esta versão tem mudanças quebrando convenções; antes de criar as rotas `/servicos/[slug]`, `/blog/[slug]`, `/sobre`, `/como-agendar`, ler o guia relevante em `node_modules/next/dist/docs/`. Os 9 serviços já vêm de uma fonte única (`SERVICES`), então as páginas de serviço podem ser geradas a partir dela, com um texto expandido por serviço.
