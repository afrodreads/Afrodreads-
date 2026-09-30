# Arquitetura do agente (Fase 2 — modo sombra)

Complementa `docs/agent-foundation.md` (Fase 1). Código em `src/lib/agent/`. **Nada aqui envia mensagem, chama
modelo real, muda agenda ou mexe em pagamento sozinho.** Não há rota nova nem schema novo nesta fase.

## 1. O V2 como especificação (sem copiar o prompt para o código)

`spec.ts` lê `agente/00-prompt-do-agente-v2.md`, divide por seção (`# N.`) e classifica cada uma:

| Camada | Seções do V2 | Vai para o modelo? |
|---|---|---|
| persona | 1, 4, 5, 6, 7, 27 | sim |
| guardrails (texto) | 2, 3, 20, 21, 23, 26 | sim, **e** reforçados em código (`guardrails.ts`) |
| conhecimento | 8, 12, 22 | sim |
| regras de negócio (explicação) | 9, 11 | sim; os números vêm do código (`policy.ts`) e um teste confere o §11 com `pricing.ts` |
| fluxo / ferramentas | 13, 14, 15, 16 | sim |
| configuração da unidade | 0 | não: vira dados estruturados (`config.ts`) |
| garantido por código | 10, 17, 18, 19, 24, 25, preâmbulo, notas | não |

Seção nova no V2 sem classificação faz um teste falhar. O §17 foi ajustado (única mudança no V2): em atendimento
humano a IA não responde nada.

## 2. Contexto do agente (`context.ts`)

O modelo recebe **dados estruturados** do backend: estado derivado (`status.ts`, vocabulário do V2), data e hora de
SP já formatadas, nome, unidade, regras do sinal (constantes de `pricing.ts`), **promoções ativas** (`promotions.ts`,
com validade no calendário de SP), agendamento confirmado (se houver) e o histórico recente. Tudo o que não está ali é
declarado **desconhecido**: preço, disponibilidade, endereço/mapa, status de pagamento.

## 3. Proteção de informação crítica

| Informação | Como é protegida |
|---|---|
| Preço / desconto | nunca está no contexto; guardrail bloqueia valor fora da lista (sinal, atraso, promoção ativa) e percentual fora do sinal |
| Promoção | só existe se ativa na data; vencida some do contexto e o guardrail bloqueia a oferta |
| Disponibilidade / agenda | sem ferramenta de agenda; guardrail bloqueia "tenho vaga", "está disponível" |
| Pagamento | sem ferramenta; guardrail bloqueia "pagamento confirmado", "recebi seu Pix" |
| Confirmação de agendamento | guardrail bloqueia; a confirmação é evento SYSTEM |
| Endereço / localização / mapa | o modelo **nunca** recebe (fica em `SecureUnitSettings`); guardrail bloqueia rua, CEP e links de mapa |
| Links | só os da lista da unidade |

Rascunho bloqueado → texto trocado pelo fallback do §3 e proposta de handoff (`AI_UNCERTAIN`).

## 4. Ferramentas (`tools.ts`)

Só duas, e ambas **apenas propõem**: `request_handoff` e `update_lead_data` (campos do §24). Qualquer outra (pagamento,
agenda, estorno, envio, preço) é rejeitada como desconhecida.

## 5. Modo sombra (`orchestrator.ts`, `shadow.ts`)

`runAgentShadow` exige `mode: "shadow"` (o tipo não tem outro valor). Fluxo:

1. idempotência por (conversa, mensagem-gatilho): a mesma mensagem nunca gera duas chamadas ao modelo;
2. **HUMAN/FINISHED → o modelo nem é chamado** (mensagem já foi salva pela Fase 1; o modo não muda);
3. monta contexto e prompt, chama o `ModelClient` (nesta fase só existe o roteirizado dos testes);
4. **relê o modo**: se a equipe assumiu durante a geração, descarta;
5. valida ferramentas e guardrails; registra o rascunho no `ShadowSink`.

As dependências do orquestrador não incluem remetente nem escrita de negócio: não há como enviar.

## 6. Eventos SYSTEM (`systemEvents.ts`)

Mensagens pós-evento **não são resposta da IA**. `PAYMENT_CONFIRMED` → confirmação + card de cuidados + localização;
`SERVICE_FINISHED` → cuidados + manutenção (se aplicação) + agradecimento com link de avaliação. Templates fixos do
V2 §18/§19; dados só do backend (status do agendamento, tipo de atendimento, cofre da unidade). Dado faltando → item
omitido e listado em `missing`. A conversa **não muda de estado**. Só existe o despachante de sombra, idempotente
por evento, que guarda o plano com endereço e mapa ocultos.

## 7. Pagamento manual e extensão de prazo (ações humanas)

- `manualPayment.ts` — `confirmManualPayment`: só `StaffActor`; registra booking, valor, método, quem, quando,
  referência, status anterior e novo; idempotente; recusa valor abaixo do sinal e horário já ocupado; devolve o
  evento `PAYMENT_CONFIRMED`.
- `paymentHold.ts` — `extendPaymentDeadline`: só `StaffActor`; motivo obrigatório; novo prazo no futuro, maior que o
  atual, até 72 h e antes do atendimento; auditável e idempotente. `effectivePaymentDeadline` mantém a regra geral de
  60 minutos para todo o resto.

Ambos estão prontos como regra testada; faltam tabela, adaptador e tela (ver propostas).

## 8. Propostas de schema (NÃO aplicadas; aguardam aprovação)

1. **`AgentRun`** — registro persistente dos rascunhos de sombra (chave única conversa+gatilho, resultado, texto,
   violações, ações propostas). Precisa de prazo de retenção.
2. **`SystemEvent`** — outbox dos eventos SYSTEM (`eventId` único, tipo, plano sem endereço, status
   PLANNED/SENT/FAILED/SKIPPED, `missing`).
3. **`PaymentConfirmation`** — auditoria da confirmação manual (campos acima, `idempotencyKey` único) e novos métodos
   (Pix/depósito/transferência) para o financeiro.
4. **Prazo de pagamento** — `PaymentHold` (auditoria) + `Booking.paymentDueAt` opcional; `activeBookingWhere` e a
   expiração diária passam a usar o prazo efetivo.
5. **Identidade da equipe** — o painel hoje tem uma senha única; `confirmedBy`/`extendedBy` precisam de usuário
   individual.
6. **Tipo de atendimento** — `appointmentType` (aplicação do zero / manutenção) no agendamento, para os cards.
7. **Configuração da unidade** — campos públicos (nome, bairro, horário humano, atendente, links, avaliação),
   promoções como tabela com validade, e endereço/mapa em configuração segura.
