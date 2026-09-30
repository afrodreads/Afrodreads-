# Fase 1 — Business Intelligence (Agente 1)

Site analisado: https://www.afrodreads.com.br/
Fontes: ver [`00-evidence-log.md`](./00-evidence-log.md).
Legenda: **FATO VERIFICADO** (com URL/arquivo) · **FONTE EXTERNA** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

## O que a empresa vende? Quem compra? Por quê? Onde? Que problema resolve?

A Afro Dreads é um estúdio especializado em dreadlocks e microlocs, que vende a formação, manutenção e revitalização de dreads sob avaliação e orçamento individual, para clientes de São Paulo (principalmente Pirituba/zona noroeste) que querem mudar de visual, manter dreads já existentes ou corrigir um trabalho malfeito em outro salão, resolvendo tanto o problema estético/identitário ("quero esse visual") quanto o de confiança técnica ("não sei em quem confiar com meu cabelo/meus dreads") — atendendo com hora marcada e conversão principal via WhatsApp. **FATO VERIFICADO** (`src/app/layout.tsx`, `src/lib/seo.ts`, homepage ao vivo).

## Perfil da empresa

| Campo | Conteúdo | Tag |
|---|---|---|
| **Empresa** | Afro Dreads — estúdio de dreadlocks/microlocs, dirigido pelo casal Lyon e Thay | INFORMADO PELO CLIENTE |
| **Indústria** | Beleza/cabelo — nicho de dreadlocks e cultura afro-capilar (schema.org `HairSalon`) | FATO VERIFICADO (`src/lib/seo.ts`) |
| **Produtos** | Não vende produto físico próprio (sem loja/e-commerce no site) | FATO VERIFICADO (rotas do site, `src/app/`) |
| **Serviços** | 9 serviços oficiais no código (ver tabela "Entidades de serviço" abaixo) | FATO VERIFICADO (`src/lib/services.ts`) |
| **Público-alvo** | (1) nunca fez dreads, (2) já tem dreads e precisa de manutenção, (3) veio de outro salão insatisfeito | FATO VERIFICADO — é literalmente o roteador "Qual é o seu momento?" da home |
| **ICP** | Pessoas (majoritariamente público afro/afro-brasileiro, dado o posicionamento de marca) em SP capital, dispostas a investir uma sessão de 2–12h e não precisar de preço fechado antecipado | INFERÊNCIA a partir de INFORMADO PELO CLIENTE + FATO VERIFICADO |
| **Mercado geográfico** | Pirituba, zona noroeste de São Paulo (SP); atendimento sazonal em São Luís do Maranhão | INFORMADO PELO CLIENTE, endereço em nível de bairro confirmado também no schema.org | 
| **Modelo de negócio** | Serviço presencial agendado; orçamento individual via avaliação (foto do cabelo atual + referência visual); sinal pago online (PIX/cartão/boleto via Mercado Pago) para confirmar o horário; saldo pago à parte | FATO VERIFICADO (`prisma/schema.prisma`: `Quote`, `Booking`, `Payment`, `PaymentMethod`) |
| **Modelo de preço** | Não público no site (`priceRange` no schema é só "$$", sem valores); preço final varia por comprimento, quantidade, espessura, material, cor e procedimento, combinado no WhatsApp | FATO VERIFICADO (`src/app/servicos/page.tsx`, FAQ) + INFORMADO PELO CLIENTE (motivo: decisão do dono) |
| **Principais problemas resolvidos** | Não saber qual método/visual escolher; medo de danificar o cabelo; confusão entre dreads e tranças; recuperar dreads malfeitos em outro salão; manter dreads já formados | FATO VERIFICADO (FAQ do site) + INFORMADO PELO CLIENTE |
| **Intenções comerciais primárias** | "agendar dreads/microlocs em Pirituba/SP", "quanto custa dreadlocks/microlocs", "retwist/manutenção de dreads SP", "revitalização de dreads" | INFERÊNCIA a partir da estrutura de serviços e CTAs |
| **Intenções informacionais primárias** | "dread danifica o cabelo?", "diferença entre dreads e tranças", "quanto tempo dura fazer dreads", "dreads em cabelo curto", "microlocs o que é" | FATO VERIFICADO — são as próprias perguntas do FAQ público |
| **Entidades importantes** | Afro Dreads, Lyon, Thay, Pirituba, São Paulo, dreadlocks, microlocs, retwist, revitalização, cultura afro-brasileira | FATO VERIFICADO + INFORMADO PELO CLIENTE |
| **Diferenciais conhecidos** | Atendimento personalizado com avaliação individual; identidade visual e discurso ligados à cultura afro-brasileira; nota 5,0 com 56 avaliações no Google; atende quem "veio de outro salão" (recuperação/revitalização) | FATO VERIFICADO (site, JSON-LD, depoimentos) |
| **Ações de conversão primárias** | Clique no WhatsApp ("Quero falar com a Afro Dreads" / "Agendar"); formulário de contato; fluxo de agendamento com pagamento de sinal | FATO VERIFICADO (`src/lib/whatsapp.ts`, `src/app/agendamento/`, `src/app/contato/page.tsx`) |

## Entidades de serviço (fonte única do código, `src/lib/services.ts`)

| Slug | Nome exibido | Duração |
|---|---|---|
| `primeira-aplicacao-topo` | Primeira aplicação (topo) | 3h–5h |
| `cabeca-toda` | Primeira aplicação (cabeça toda) | 4h–8h |
| `microlocs` | Microlocs | 8h–12h |
| `retwist` | Retwist | 3h–5h |
| `revitalizacao` | Revitalização | 6h–8h |
| `retwist-twist` (slug) | **Start Locs** (nome exibido) | 3h–5h |
| `penteados` | Penteados | 2h–5h |
| `short-dread` | Short Dread | 3h–5h |
| `cultivo-agulhado` | Cultivo Agulhado | 4h–8h |

**INFERÊNCIA / achado relevante:** o `references/business-context.md` (INFORMADO PELO CLIENTE) lista apenas 5 famílias de serviço (Primeira aplicação, Microlocs, Retwist/Retwist+Twist, Revitalização, Penteados) e não menciona **Start Locs**, **Short Dread** nem **Cultivo Agulhado**, que existem de fato no site e no banco de dados. Isso importa para as próximas fases: são 3 entidades/páginas de serviço com potencial de busca própria ("start locs o que é", "short dread", "cultivo agulhado dreadlocks") que não estavam no radar do contexto de negócio. **RECOMENDAÇÃO:** validar com o cliente se o `business-context.md` deve ser atualizado, e tratar essas 3 entidades como serviços de primeira classe na pesquisa de palavras-chave (Fase 5) e na arquitetura de conteúdo (Fase 11), não apenas como aliases.

Também note-se a divergência de nomenclatura do slug `retwist-twist` → nome exibido "Start Locs" (o slug sugere "Retwist + Twist", mas o nome público mudou para "Start Locs"). **INFERÊNCIA:** possível resquício de rename no código; não afeta o usuário final (que só vê "Start Locs"), mas vale checar na auditoria técnica se URLs/âncoras internas usam o slug antigo de forma inconsistente.

## Entidades de local

- Pirituba, São Paulo — SP (nível de bairro/cidade, publicado). **FATO VERIFICADO**
- Endereço completo — não público, enviado só após confirmação do agendamento. **INFORMADO PELO CLIENTE** (decisão deliberada; não recomendar publicar endereço completo nem usar endereço fake no schema).
- São Luís do Maranhão — atendimento sazonal fora de SP. **INFORMADO PELO CLIENTE**, também refletido no código via `Booking.isOutOfTownSeason` (`prisma/schema.prisma`) → **FATO VERIFICADO** que o sistema já modela atendimento fora de SP.

## Pessoas associadas à empresa

- Lyon e Thay — fundadores/casal responsável pelo estúdio. **INFORMADO PELO CLIENTE**. O site hoje não expõe uma página "Sobre"/bios com esses nomes — oportunidade de Entity SEO (Fase 8).

## Entidades de indústria

Beleza e cuidados capilares → subnicho "dreadlocks/locs/microlocs" → cultura afro-brasileira/afro-capilar. **FATO VERIFICADO** (posicionamento visual e textual do site) + **INFORMADO PELO CLIENTE**.

## Entidades de concorrentes

Não pesquisadas nesta fase — pertence à **Fase 4 (Competitor Intelligence)**, que fica **pendente** por decisão do usuário (ver resumo final).

## Observações que alimentam as próximas fases

- **Fonte de tráfego atual** (INFORMADO PELO CLIENTE): Instagram orgânico, anúncios pagos, Google/Maps — relevante para priorizar SEO local e conteúdo "topo de funil" que hoje provavelmente não é a origem principal de tráfego.
- **`aggregateRating` fixo no JSON-LD** (5,0 / 56 avaliações, `src/lib/seo.ts`) é um dado real mas **estático no código** — não atualiza sozinho conforme novas avaliações chegam no Google. Isso é relevante tanto para a Fase 2 (marcação enganosa/desatualizada) quanto para GEO (dado citável precisa ser mantido correto). Repassado para o auditor técnico.
- **Confusão dreads vs. tranças** e **objeções** (preço, medo de danificar o cabelo, tempo de sessão, deslocamento) são ativos de conteúdo/GEO de alto valor (perguntas que pessoas fazem tanto no Google quanto a assistentes de IA) — insumo direto para as Fases 5–7 quando forem retomadas.
