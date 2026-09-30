# Agente — Fase 3: persistência, observabilidade e modo sombra

Continua de `docs/agent-foundation.md` (Fase 1) e `docs/agent-architecture.md` (Fase 2). **Nada envia mensagem a
clientes; não há ManyChat, WhatsApp nem modelo de IA real conectados.** Código em `src/lib/agent/` (regras, sem banco)
e `src/lib/agent-db/` (adaptadores Prisma). Migration: `20260930220000_agent_shadow_persistence`.

## Fluxo de uma execução

```
Mensagem do cliente ──► receiveInboundMessage (Fase 1: Customer, Conversation, Message)
        │  duplicada? → para (sem AgentRun)
        │  conversa em HUMAN/FINISHED? → para (sem modelo, sem AgentRun)
        ▼
INPUT → CONTEXT (dados estruturados, até a mensagem) → MODEL → TOOLS (só propostas)
      → GUARDRAILS → SHADOW RESULT → AgentRun          (nunca → Message OUTBOUND)
```

Entrada: `handleInboundShadow` (`pipeline.ts`), que é o que um webhook futuro chamará. As dependências de produção são
montadas por `createShadowDeps` (`agent-db/index.ts`), que **exige** o modelo como parâmetro. Nesta fase só existem
modelos roteirizados (testes).

## Tabelas novas

| Tabela | Para quê |
|---|---|
| `AgentRun` | Uma execução: conversa, mensagem, modelo, versão do prompt, modo (SHADOW), gatilho (INBOUND/REPLAY), estado, intenção, temperatura, qualificação, resposta candidata, guardrails, handoff proposto, ferramentas rejeitadas, resumo do contexto, duração, erro (sem segredos). Chave de idempotência única. |
| `PromptVersion` | Nome declarado no arquivo (`V2`) + SHA-256 do conteúdo normalizado (LF, sem BOM) + conteúdo. Cada AgentRun aponta para uma versão. |
| `SystemEvent` | Fila (outbox) de eventos SYSTEM: tipo, entidade, payload, status, tentativas, erro, plano (sem endereço), dados faltantes, datas, chave de idempotência única. |
| `StaffUser` | Pessoas da equipe: nome, função (ADMIN/ATTENDANT), unidade, ativo. Sem senha. |
| `PaymentConfirmation` | Confirmação manual (PIX/DEPOSIT/TRANSFER): booking, valor, método, quem, quando, comprovante, status anterior e novo. |
| `PaymentHold` | Extensão manual do prazo: prazo anterior, novo, motivo, quem. O prazo vigente fica em `Booking.paymentDueAt`. |
| `Brand` | Dados da marca (nome, links públicos). Separados da unidade. |
| `Promotion` | Promoção por unidade: nome, início, fim, ativa, preço, regras, condições, serviço aplicável. |

Colunas novas (todas opcionais): `Booking.paymentDueAt`, `Booking.appointmentType` (FIRST_APPLICATION/MAINTENANCE;
**nulo = não classificado**, nunca inventado), e em `Unit` os campos de configuração (região, horário humano, link de
avaliação, estacionamento, endereço, mapa, telefone, marca). A migration preenche a configuração pública da unidade e a
promoção de aniversário a partir do V2; **endereço, mapa e telefone ficam vazios** até a equipe cadastrar.

## Versão do prompt, replay e comparação

- `promptVersion.ts`: nome + hash; o mesmo texto tem o mesmo hash no Windows e no Linux.
- `replayAgentRun`: reexecuta em sombra uma mensagem salva (ou a de um AgentRun) com outro prompt ou modelo. Reconstrói o
  contexto **como era no momento da mensagem**: mensagens e transições posteriores ficam fora e a data de referência é a
  da mensagem. Não recebe o store de conversas, então não consegue alterar nada. Idempotente por
  (mensagem, versão do prompt, modelo, rótulo).
- `compareByPromptVersion`: agrupa as execuções de uma mensagem por versão (V2 × V3 …). Por enquanto não há tela para
  isso; o modelo de dados já suporta.

## SYSTEM ≠ IA

- **IA**: gera rascunho, interpreta, qualifica, propõe handoff. Nunca executa nada.
- **SYSTEM**: eventos confirmados (`PAYMENT_CONFIRMED` pela equipe, `SERVICE_FINISHED` ao finalizar), templates fixos,
  dados do banco. Não interpreta conversa nem inventa dados. `systemEvents.ts` não importa nada da IA (um teste garante).
- A confirmação manual grava o agendamento, a auditoria e o evento **na mesma transação**. Um agendamento gera um único
  `PAYMENT_CONFIRMED`, seja confirmado manualmente ou pelo Mercado Pago.
- O processamento reserva o evento de forma atômica (um processador por vez), com tentativas limitadas (5) e retomada
  após 10 minutos se travar.

## Equipe, pagamento manual e prazo

`authorizeStaff` exige um StaffUser **ativo**, com a permissão, e da **unidade** do recurso. ADMIN sem unidade vale
para todas; agendamento antigo sem unidade exige ADMIN. IA, SYSTEM e cliente não conseguem nem montar um ator válido.
A política do prazo (`DEFAULT_PAYMENT_HOLD_POLICY`: 72 h, motivo ≥ 10 caracteres) fica num lugar só e é parâmetro.

**Incompatibilidade com o login atual:** o painel usa uma senha única, sem identidade individual. Por isso **não há tela
nem rota** de confirmação manual ou de extensão de prazo nesta fase. Antes de expor essas ações, o login precisa
identificar a pessoa (StaffUser, pelo campo `authSubject`). O login existente não foi alterado.

## Painel

`/admin/agente` (protegido pelo `src/proxy.ts`, que cobre `/admin/*`): as últimas 50 execuções (data, resultado,
intenção, temperatura, resposta sugerida, guardrail, handoff sugerido, versão do prompt, modelo, duração) e as métricas
das últimas 500. Só leitura, renderizado no servidor, sem rota de API.

## Métricas de sombra (`metrics.ts`)

Taxa de handoff, taxa de bloqueio por guardrail, execuções sem resposta candidata, erros, intenções e tempo (média, p95,
máximo). Medem o agente; **não existe nota, ranking nem pontuação de clientes**.
