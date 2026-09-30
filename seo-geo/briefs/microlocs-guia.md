# Brief 1 — Microlocs: o que são, como funcionam e o que define o preço

Legenda: FATO VERIFICADO · INFORMADO PELO CLIENTE · INFERÊNCIA · RECOMENDAÇÃO. Volume de busca: NÃO VERIFICADO.

| Campo | Conteúdo |
|---|---|
| **Título** | Microlocs: o que são, como funcionam, quanto tempo levam e o que define o preço |
| **Keyword primária** | microlocs |
| **Secundárias** | microdreads (mencionar como "também chamado de"), microlocs sp, microlocs cabelo crespo, quanto tempo dura microlocs |
| **Intenção** | Informacional com forte ponte comercial |
| **Público** | Quem nunca fez dreads e quer fios finos; quem já tem dreads grossos e quer trocar |
| **Funil** | Topo-meio |
| **Objetivo de negócio** | Levar ao WhatsApp para avaliação do cabelo e orçamento de Microlocs (serviço de 8–12 h — FATO VERIFICADO, `src/lib/services.ts`) |
| **Objetivo SEO** | Ser o primeiro guia completo em pt-BR (zero guias hoje — `05-keywords.md`, `06-serp.md` §1) |
| **Objetivo GEO** | Ser a fonte que uma IA cita para "microlocs o que é" (campo vazio em pt-BR — `07-geo.md`, Prompt 3) |
| **URL** | `/blog/microlocs-o-que-sao-como-funcionam` |
| **Meta title** | Microlocs: o que são, como funcionam e preço \| Afro Dreads (≤ 60) |
| **Meta description** | Guia de microlocs por quem faz em Pirituba, SP: o que são, quanto tempo leva a sessão, o que define o preço e como cuidar. (≤ 155) |
| **H1** | Microlocs: o que são e como funcionam |

## Outline
1. **Resposta direta (primeiros 2 parágrafos):** o que são microlocs em uma frase, e para quem servem. "Na Afro Dreads usamos o nome Microlocs" (regra do dono; "microdreads" só como sinônimo de busca).
2. Como os microlocs são feitos: passo a passo da técnica *(o dono descreve o método que usa de fato — não escrever técnica genérica)*.
3. Quanto tempo leva: sessão de **8 a 12 h** (FATO VERIFICADO no site) e por que é tão longa.
4. Para quem é indicado / para quem **não** é.
5. Microlocs × dreads tradicionais (resumo + link para o artigo de comparação).
6. Vantagens e limitações, com honestidade (visual, versatilidade, tempo de manutenção, tempo de formação).
7. O que define o preço (sem valores): comprimento, quantidade, espessura, material, cor, tipo de procedimento (mesma lista do FAQ do site) + como funciona o orçamento (foto do cabelo atual + referência visual).
8. Cuidados e manutenção *(o dono informa a rotina recomendada)*.
9. Erros comuns / mitos.
10. FAQ (5–7 perguntas).
11. CTA final: enviar foto e referência pelo WhatsApp.

## Perguntas a responder
O que são microlocs? Qual a diferença para dreads? Quanto tempo leva? Dói? Serve para meu cabelo? Quanto tempo duram? Como lavar? Quanto custa (o que define)?

## Entidades a incluir
Afro Dreads, Lyon, Thay, Pirituba, São Paulo, microlocs, dreadlocks, retwist, sisterlocks (apenas como termo comparativo, só se o dono aprovar), cabelo crespo/cacheado.

## Dados a incluir (que só o dono tem)
Duração real de cada etapa, diâmetro dos fios que trabalha, número de sessões/clientes se quiser publicar, fotos de antes/depois com **consentimento**, tempo típico de formação completa. **Não inventar números.**

## Fontes a pesquisar (FONTE EXTERNA)
Artigos internacionais já ranqueados (heymane, styleseat blog, whatnaturalslove) apenas para ver estrutura, **sem copiar**; literatura dermatológica sobre alopecia por tração se o texto tocar em saúde.

## Fraquezas dos concorrentes / diferenciação
Os resultados existentes são em inglês, de Instagram e TikTok, sem experiência de praticante e sem guia em pt-BR. Diferenciar com fotos e vídeos **próprios** (já existem em `public/microlocs-*`), voz de profissional, honestidade sobre limitações e uma explicação clara da duração.

## Links internos
De: `/servicos/microlocs`, `/blog/microlocs-vs-dreads`, home. Para: `/servicos/microlocs` (CTA), `/blog/quanto-custa-microlocs-o-que-define-o-preco`, `/como-agendar`, `/portfolio`.

## Referências externas
Apenas fontes confiáveis e citadas (dermatologia/tricologia), quando houver afirmação de saúde.

## CTA
"Envie uma foto do seu cabelo e a referência que você gostou pelo WhatsApp — a avaliação é individual."

## FAQ sugerido
Microlocs e microdreads são a mesma coisa? · Quanto tempo leva? · Serve para cabelo curto? · Quanto custa? · Como lavar? · Posso trocar dreads grossos por microlocs?

## Schema
`Article` (autor Lyon/Thay como `Person`, `publisher` Afro Dreads, `datePublished`, `dateModified`), `FAQPage` (só se as perguntas estiverem visíveis na página), `BreadcrumbList`.

## Requisitos E-E-A-T (o dono precisa fornecer)
Fotos reais do processo, exemplos de clientes com autorização, quem assina (Lyon e/ou Thay), experiência prática declarada, política de cuidados.

## Oportunidade IA / citação
Frase de definição em 1–2 linhas no topo, tabela "microlocs × dreads", lista de fatores de preço, FAQ visível. Registrar no `geo-prompt-tests.md` os prompts nº 3 e nº 11 e medir após a publicação.
