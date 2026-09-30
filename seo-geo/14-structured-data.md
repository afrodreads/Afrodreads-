# Fase 14 — Plano de Dados Estruturados (Agente 14)

Base: `02-technical.md` (achados 1, 2, 3, 10), `src/lib/seo.ts`, `08-entities.md`.
Legenda: **FATO VERIFICADO** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

Regra do skill: só schema que representa fielmente a página; nada enganoso; nenhum dado inventado; sem endereço que o dono não quer público.

## 1. Estado atual (FATO VERIFICADO)

Um único bloco JSON-LD `HairSalon` (`src/lib/seo.ts`, injetado em `layout.tsx` para todas as páginas), com: nome, descrição, URL, `image` (o logo), e-mail, telefone, `priceRange: "$$"`, `address` (só cidade/região), `areaServed`, `OfferCatalog` com os 9 serviços, `openingHoursSpecification` (terça a sábado, 10h–18h), `sameAs` (WhatsApp, Instagram, TikTok, YouTube) e `aggregateRating` (5,0 / 56, valores fixos).

## 2. Ajustes no schema existente

| # | Ajuste | Por quê | Tag |
|---|---|---|---|
| 1 | **Rever `aggregateRating`** (Fase 2, HIGH nº 1). Opções: (a) remover do JSON-LD e deixar a nota só como texto atualizado manualmente; (b) manter e criar uma rotina/registro de atualização do valor. Não é possível marcar avaliações do próprio negócio como se fossem avaliações de terceiros para rich result de "avaliações agregadas" — as diretrizes do Google para review snippets restringem avaliações autopublicadas do próprio site | Evitar dado desatualizado ou marcação que possa ser ignorada/penalizada; IAs podem citar nota errada | RECOMENDAÇÃO (verificar a diretriz vigente do Google antes de decidir) |
| 2 | Trocar `image` por foto real do trabalho (Fase 2, LOW nº 10) e incluir mais de uma imagem | O logo não representa o serviço | RECOMENDAÇÃO |
| 3 | Reconsiderar `priceRange: "$$"` | É um valor genérico; o dono decidiu não publicar preços. Se mantido, deve refletir a realidade | INFERÊNCIA |
| 4 | Confirmar que horário e telefone são idênticos ao Google Business Profile | Consistência de entidade (`08-entities.md`) | RECOMENDAÇÃO |
| 5 | Adicionar `founder`/`employee` (`Person`) quando `/sobre` existir | Relação Pessoa → Organização | RECOMENDAÇÃO |
| 6 | Manter **sem** endereço de rua e **sem** `geo` de rua | Decisão do dono | INFORMADO PELO CLIENTE |
| 7 | Mudar `url` de cada `Service` do `OfferCatalog` de `/servicos#slug` para `/servicos/slug` quando as páginas existirem | Coerência | RECOMENDAÇÃO |

## 3. Novo schema por página

| Página | Schema | Por quê | Informação necessária | Validação |
|---|---|---|---|---|
| Home | `HairSalon` (existente, ajustado) + `WebSite` (`name`, `url`) | Entidade principal | Já disponível | Rich Results Test / Schema Markup Validator |
| `/servicos` | `FAQPage` (as 9 perguntas visíveis) + `BreadcrumbList` | O FAQ existe e está visível no HTML; falta marcação (Fase 2, HIGH nº 2). Observação (**INFERÊNCIA a partir de conhecimento geral, sem fonte consultada nesta sessão — verificar a documentação vigente do Google**): os rich results de FAQ passaram a ser restritos a certos tipos de site, então o ganho esperado é de **entendimento por máquinas/IA**, não de rich result garantido | Textos já existentes em `FAQ_ITEMS` | Confirmar que o texto marcado é igual ao visível |
| `/servicos/[slug]` (7–8) | `Service` (`name`, `description`, `provider` = organização, `areaServed`, `serviceType`) + `BreadcrumbList` + `FAQPage` (se houver FAQ visível) | Cada serviço vira entidade | Nome, descrição, duração, área de atendimento | **Sem `Offer`/preço** |
| `/servicos/cultivo-agulhado`, `/servicos/microlocs` etc. | `VideoObject` (só se o vídeo estiver na página, com título, descrição, miniatura, data de envio) | Os vídeos já existem no projeto | Metadados de cada vídeo | Validar no Rich Results Test |
| `/blog/[slug]` | `Article` (ou `BlogPosting`) com `author` `Person`, `publisher`, `datePublished`, `dateModified`, `image` + `BreadcrumbList` (+ `FAQPage` se houver FAQ visível) | Autoria e frescor | Autor real, datas reais | — |
| `/sobre` | `AboutPage` + `Person` (Lyon, Thay) com `worksFor` | Entidade pessoa | Nomes e perfis reais que o dono quiser publicar | `sameAs` só com perfis reais |
| `/como-agendar` | `WebPage` (+ `FAQPage` se houver perguntas visíveis) | Processo | Regras vigentes | — |
| `/portfolio` | `ImageObject`/`ImageGallery` com legenda e `creator`; `VideoObject` para vídeos | Prova visual | Legendas descritivas | — |
| `/contato` | `ContactPage` (opcional) | Contato | Telefone/WhatsApp | — |

## 4. O que NÃO marcar

- `Review`/`AggregateRating` para depoimentos escritos no próprio site como se fossem avaliações independentes.
- Endereço de rua, coordenadas exatas ou "CEP" que o dono não publica.
- `Offer` com preço (não há preços públicos).
- `LocalBusiness` duplicado em várias páginas com dados diferentes: manter **uma** entidade, referenciada por `@id`.

## 5. Exemplo de JSON-LD pronto (só com dados reais)

`FAQPage` para `/servicos`. As perguntas e respostas são as do site, sem alteração (FATO VERIFICADO, `src/app/servicos/page.tsx`). Aqui, três das nove, para ilustrar a estrutura; na implementação, incluir todas as 9 geradas a partir de `FAQ_ITEMS`:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Vocês fazem tranças?",
      "acceptedAnswer": { "@type": "Answer", "text": "Não. Trabalhamos com dreads, microlocs e retwist." }
    },
    {
      "@type": "Question",
      "name": "Onde fica a Afro Dreads?",
      "acceptedAnswer": { "@type": "Answer", "text": "Em Pirituba, zona noroeste de São Paulo. O endereço completo é enviado depois que o agendamento é confirmado." }
    },
    {
      "@type": "Question",
      "name": "Quanto custa para fazer dreads?",
      "acceptedAnswer": { "@type": "Answer", "text": "O valor depende do projeto: comprimento, quantidade, espessura, material, cor e tipo de procedimento. Por isso, o valor final é combinado diretamente com você pelo WhatsApp." }
    }
  ]
}
```

**Implementação (RECOMENDAÇÃO):** gerar o JSON-LD a partir do mesmo array `FAQ_ITEMS`, para que texto visível e texto marcado nunca divirjam.
