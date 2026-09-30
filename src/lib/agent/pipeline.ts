import { finishConversation } from "../conversations/conversation";
import { receiveInboundMessage, type InboundMessageInput, type InboundMessageResult } from "../conversations/message";
import type { ConversationsStore } from "../conversations/repo";
import type { Actor } from "../conversations/types";
import { runAgentShadow, type LiveDeps, type RunResult } from "./orchestrator";
import { serviceFinishedEvent, type SystemEventStore } from "./systemEvents";

// Pontos de entrada internos (ainda sem rota, sem webhook, sem canal conectado).
//
// handleInboundShadow: é o que um webhook futuro chamará. Salva a mensagem do
// cliente (Fase 1) e, só se a IA puder responder, roda o agente em SOMBRA.
// Mensagem duplicada ou conversa em HUMAN/FINISHED: nenhum AgentRun, nenhum
// modelo chamado.

export type InboundShadowResult = { inbound: InboundMessageResult; agent: RunResult };

export async function handleInboundShadow(
  deps: { conversations: ConversationsStore; agent: LiveDeps },
  input: InboundMessageInput,
  now: Date = new Date(),
): Promise<InboundShadowResult> {
  const inbound = await receiveInboundMessage(deps.conversations, input, now);

  if (inbound.duplicate) return { inbound, agent: { outcome: "DUPLICATE", runId: null, result: null } };
  if (!inbound.aiMayRespond) return { inbound, agent: { outcome: "SKIPPED_NOT_BOT", runId: null, result: null } };

  const agent = await runAgentShadow(deps.agent, {
    conversationId: inbound.conversationId,
    triggerMessageId: inbound.messageId,
    now,
  });
  return { inbound, agent };
}

/**
 * A equipe finaliza o atendimento (HUMAN → FINISHED) e o evento SYSTEM
 * SERVICE_FINISHED entra na fila. Quem finaliza é sempre a equipe/sistema; a
 * mensagem pós-atendimento sai por template, nunca pela IA.
 */
export async function finishConversationWithEvent(
  deps: { conversations: ConversationsStore; events: SystemEventStore },
  params: { conversationId: string; actor: Actor; bookingId?: string | null; now?: Date },
) {
  const now = params.now ?? new Date();
  const result = await finishConversation(deps.conversations, {
    conversationId: params.conversationId,
    actor: params.actor,
    now,
  });
  const event = await deps.events.enqueue(
    serviceFinishedEvent({
      conversationId: params.conversationId,
      unitId: result.conversation.unitId,
      finishedAt: now,
      bookingId: params.bookingId ?? null,
    }),
    now,
  );
  return { conversation: result.conversation, eventId: event.id };
}
