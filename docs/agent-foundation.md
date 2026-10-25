# Fundação do agente de atendimento (Fase 1)

Esta fase cria **somente a infraestrutura de dados e de estados** para o agente existir no futuro.
Nada aqui conversa com clientes, chama IA, envia mensagem ou expõe rota. Código em
`src/lib/conversations/`, schema em `prisma/schema.prisma`, migration
`20260930200000_add_agent_foundation`.

Padrão (o mesmo da Fase 0): **ROTA → SERVIÇO/REGRA → BANCO**. As regras são módulos puros, testados com um
banco em memória (`memoryRepo.ts`); o Prisma fica isolado em `prismaRepo.ts`.

## Entidades e relações

```
Unit 1 ─── N Customer 1 ─── N Conversation 1 ─── N Message
  │            │                   ├── N Handoff
  │            └── N Booking       └── N ConversationTransition (auditoria)
  └── N Conversation / N Booking
```

| Entidade | Para que serve | Pontos importantes |
|---|---|---|
| **Unit** | Unidade física. A marca (Afro Dreads) não é uma unidade. | `slug` único, `timezone`, `active`. Endereço, telefone e horário **não** ficam em código; entram como dados quando o agente precisar. A migration cria a unidade atual (`principal`). |
| **Customer** | Pessoa atendida naquela unidade. | Telefone normalizado; `@@unique([unitId, phone])` impede duplicar dentro da unidade. O mesmo telefone em outra unidade é outro cliente. |
| **Conversation** | Uma conversa com um cliente em um canal. | `mode` (BOT/HUMAN/FINISHED), `assignedTo`, `lastContactAt`, `externalId` (id no canal; único por unidade+canal). |
| **Message** | O mínimo para reconstruir o contexto. | `direction`, `sender` (CUSTOMER/AI/HUMAN/SYSTEM), `content`, `externalId` (idempotência), `metadata` mínimo. Nunca o payload bruto do provedor. |
| **Handoff** | Encaminhamento para a equipe, com resumo estruturado. | `reason`, `summary` (JSON validado), `status` (OPEN/CLAIMED/RESOLVED), `claimedBy`, timestamps. |
| **ConversationTransition** | Trilha de auditoria de cada mudança de modo. | De/para, quem (`actor` + `actorRef`), motivo, handoff relacionado, quando. |
| **Booking** (existente) | Ganhou `customerId` e `unitId`, **opcionais**. | Agendamentos antigos continuam válidos com os dois nulos. |

## Estados e regras de transição

```
BOT ──► HUMAN ──► FINISHED ──► BOT
```

| Transição | Quem pode | Exige |
|---|---|---|
| BOT → HUMAN | IA, equipe, sistema | **Handoff** com motivo e resumo |
| HUMAN → FINISHED | equipe, sistema (a IA não) | resolve os handoffs em aberto |
| FINISHED → BOT | equipe, sistema (a IA não se reativa) | — (retomada da IA) |

Qualquer outra combinação (BOT→FINISHED, HUMAN→BOT, FINISHED→HUMAN, ficar no mesmo estado) é recusada. Se o
negócio precisar de mais caminhos, acrescente-os em `stateMachine.ts` com teste.

Garantias:

- **HUMAN bloqueia a IA.** `canAiRespond(mode)` só é verdadeiro em BOT. A garantia forte está em
  `recordOutboundMessage`: mensagem da IA só é gravada se a conversa **ainda** estiver em BOT, na mesma operação
  atômica. Se a equipe assumir enquanto a IA gera a resposta, a resposta é recusada (`AiResponseBlockedError`).
- **Transições atômicas.** A troca de modo só vale se o modo ainda for o esperado; duas passagens simultâneas
  resultam em um único Handoff (a outra recebe `TransitionConflictError`).
- **Tudo auditado.** Cada transição grava uma linha em `ConversationTransition`. Pessoas da equipe precisam ser
  identificadas (`ref`) para agir.
- **Mensagem do cliente numa conversa FINISHED** reabre a conversa (FINISHED → BOT, autor SYSTEM, auditado).
  Em HUMAN, a mensagem é guardada e a IA continua sem responder.

## Normalização de telefone (Brasil)

Forma canônica: **E.164 com `+`**, ex.: `+5511987654321` (`phone.ts`).

- Aceita só dígitos e `( ) + - . espaço`; letras, ramal etc. são rejeitados (`null`), nunca "adivinhados".
- `+55…` / `0055…` = Brasil com código do país. Sem marcador: remove um `0` de tronco e, se sobrarem 12–13 dígitos
  começando em `55`, remove o código do país (inequívoco, inclusive para o DDD 55 do RS).
- DDD de 11 a 99. Celular: 9 dígitos começando em 9. **Celular antigo de 8 dígitos (6–9) ganha o 9**, para o mesmo
  aparelho não virar dois clientes. Fixo de 8 dígitos (2–5) é mantido.
- Outros países: E.164 genérico (8–15 dígitos).
- Nos logs use `maskPhone` (`+55…4321`); nunca registre o número inteiro.

## Como o agente vai usar isto (fases futuras)

1. **Entrada** (webhook futuro, autenticado/assinado): `receiveInboundMessage` acha/cria cliente e conversa, grava a
   mensagem de forma idempotente e devolve `aiMayRespond`.
2. **Decisão**: se `aiMayRespond` for falso, o agente não responde. Se for verdadeiro, consulta
   `checkAiMayRespond` antes de gerar a resposta.
3. **Resposta**: `recordOutboundMessage` com `sender: "AI"` (a trava acima) e só então o envio real.
4. **Passagem para a Thay**: `handoffToHuman` com `reason` e um resumo (`HandoffSummary`). A equipe assume com
   `claimHandoff`, encerra com `finishConversation`.
5. **Agendamentos**: `linkBookingToCustomer` relaciona agendamento e cliente por telefone (hoje chamado, em
   melhor esforço, ao concluir um orçamento).

Unidade: `resolveUnit` exige indicar a unidade quando houver mais de uma ativa; com uma só, resolve sozinha.

## Segurança e privacidade

- **Nenhuma rota pública** expõe cliente, conversa, mensagem ou encaminhamento (há teste que garante isso). As
  futuras APIs do agente devem exigir autenticação/assinatura própria (ex.: assinatura do provedor + segredo) e
  nunca ficar sob rotas públicas sem verificação.
- Mensagens são dados pessoais: guarde só texto e metadados mínimos; não logue conteúdo; defina um prazo de
  retenção antes de ligar o agente. Apagar um `Customer` remove suas conversas (LGPD) e **preserva** os
  agendamentos (`customerId` vira nulo).
- Integrações externas (Claude, ManyChat, WhatsApp) **não** estão ligadas; um teste confere que o código da
  fundação não faz chamadas de rede nem importa provedores.

## Retrocompatibilidade

A migration é **aditiva**: só cria enums/tabelas novas e duas colunas opcionais em `Booking`; não altera nem apaga
dados. Agendamentos antigos seguem funcionando sem cliente/unidade. Um telefone antigo que não dá para normalizar
deixa o agendamento sem vínculo (nunca falha). Um backfill futuro pode chamar `linkBookingToCustomer` para cada
agendamento sem cliente.
