# Campanha: Clube Afro Dreads (lançamento)

Rascunho do Claude, 2026-11-13. **Nada criado nem ativado.** Gasto só com OK do Lyon.

## Antes de criar

1. Mesclar o PR #62 (página /clube + pixel). Sem isso o evento Lead não existe no site no ar.
2. Abrir afrodreads.com.br/clube e clicar no botão uma vez, para a Meta ver o evento Lead do
   domínio de produção no Gerenciador de Eventos.
3. Criativos aprovados (briefing em `afrodreads-motion/projects/clube-anuncios/briefing.md`).

## Configuração

| Item | Valor |
|---|---|
| Campanha | `CLUBE | Leads | Site | lançamento` |
| Objetivo | Leads, local da conversão: site, evento **Lead** (pixel 1347666750252386) |
| Orçamento | **R$ 30/dia** no conjunto, 14 dias (17 a 30/11) = **R$ 420** no máximo |
| Conjunto | 1 só (aprendizado precisa de ~50 Leads em 7 dias; a R$ 30/dia e Lead entre R$ 1 e R$ 3, dá) |
| Público | Brasil, 18–45, todos os gêneros, Público Advantage+ ligado (o criativo filtra o nicho) |
| Posicionamentos | Advantage+ (vai para Reels e Stories, que são mais baratos) |
| Anúncios | C1, C2 e C3 no mesmo conjunto, cada um com seu UTM |
| Melhorias de criativo Advantage+ | **Desligadas** (música, filtros, texto gerado pela Meta) |
| Atribuição | 7 dias clique / 1 dia visualização |

Observação: a Black Friday encarece o CPM em 40% a 70%. O custo por Lead da primeira semana
vai ser mais alto que o normal.

## Como medir

- Lead (clique no botão) vem da Meta. **Membro** de verdade vem do grupo: o motor registra o número
  de participantes a cada conexão (`out/motor.log`).
- Custo por membro = gasto ÷ membros novos. É isso que decide, não o custo por Lead.

## Regras de decisão (do plano de 90 dias)

| Quando | Se | Então |
|---|---|---|
| Dia 3 | Algum criativo com CTR < 0,8% e outro bem acima | Pausar o fraco (com OK) |
| Dia 7 (24/11) | Custo por membro > R$ 5 | Trocar criativo e oferta de vitrine |
| Dia 7 | Custo por membro < R$ 3 | Subir 20% a verba (com OK) |
| Dia 14 (29/11) | Portão do plano | Ver custo por membro e saídas do grupo |

Conta: com R$ 420 e custo de R$ 3 por membro → ~140 membros. Com R$ 5 → ~84.
