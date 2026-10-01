import { finishConversation } from "../conversations/conversation";
import { receiveInboundMessage, type InboundMessageInput, type InboundMessageResult } from "../conversations/message";
import type { ConversationsStore } from "../conversations/repo";
import type { Actor } from "../conversations/types";
import { decideGrouping, normalizeGroupingPolicy, type GroupingPolicy, type GroupingReader } from "./grouping";
import { runAgentShadow, type LiveDeps, type RunResult } from "./orchestrator";
import { serviceFinishedEvent, type SystemEventStore } from "./systemEvents";

// Pontos de entrada internos. A rota autenticada (/api/agent/inbound) usa
// `ingestInbound` (rápido, dentro da requisição) e agenda
// `processAfterQuietPeriod` para depois da resposta HTTP. Tudo em SOMBRA:
// nenhum ponto daqui envia mensagem a cliente.

export type IngestResult = {
  inbound: InboundMessageResult;
  /** true quando vale agendar a execução do agente (mensagem nova e conversa em BOT). */
  shouldProcess: boolean;
};

/** Salva a mensagem do cliente (Fase 1). Duplicada ou conversa em HUMAN/FINISHED: nada a processar. */
export async function ingestInbound(
  conversations: ConversationsStore,
  input: InboundMessageInput,
  now: Date = new Date(),
): Promise<IngestResult> {
  const inbound = await receiveInboundMessage(conversations, input, now);
  return { inbound, shouldProcess: !inbound.duplicate && inbound.aiMayRespond };
}

export type ProcessOptions = {
  policy?: Partial<GroupingPolicy>;
  /** Espera (injetável nos testes). */
  sleep?: (ms: number) => Promise<void>;
  /** Relógio (injetável nos testes). */
  now?: () => Date;
};

export type ProcessResult = RunResult | { outcome: "GROUPED"; runId: null; result: null };

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Espera um curto silêncio e, se esta ainda for a mensagem mais nova do
 * cliente (ou se a espera máxima estourou), roda o agente em sombra com todas
 * as mensagens pendentes no contexto. Se chegou mensagem mais nova, não roda:
 * a execução da mais nova responde tudo junto.
 */
export async function processAfterQuietPeriod(
  deps: { agent: LiveDeps; grouping: GroupingReader },
  job: { conversationId: string; triggerMessageId: string },
  options: ProcessOptions = {},
): Promise<ProcessResult> {
  const policy = normalizeGroupingPolicy(options.policy);
  const sleep = options.sleep ?? realSleep;
  const clock = options.now ?? (() => new Date());

  if (policy.quietMs > 0) await sleep(policy.quietMs);

  const pending = await deps.grouping.pendingCustomerMessages(job.conversationId);
  const decision = decideGrouping({ triggerMessageId: job.triggerMessageId, pending, now: clock(), policy });
  if (decision === "grouped") return { outcome: "GROUPED", runId: null, result: null };

  return runAgentShadow(deps.agent, { ...job, now: clock() });
}

export type InboundShadowResult = { inbound: InboundMessageResult; agent: ProcessResult };

/**
 * Atalho síncrono (sem espera): salva e, se for o caso, roda o agente na hora.
 * Usado em testes e ferramentas internas.
 */
export async function handleInboundShadow(
  deps: { conversations: ConversationsStore; agent: LiveDeps },
  input: InboundMessageInput,
  now: Date = new Date(),
): Promise<InboundShadowResult> {
  const { inbound, shouldProcess } = await ingestInbound(deps.conversations, input, now);
  if (inbound.duplicate) return { inbound, agent: { outcome: "DUPLICATE", runId: null, result: null } };
  if (!shouldProcess) return { inbound, agent: { outcome: "SKIPPED_NOT_BOT", runId: null, result: null } };

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
