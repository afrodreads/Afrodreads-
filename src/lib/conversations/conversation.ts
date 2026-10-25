import {
  ConversationNotFoundError,
  HandoffNotClaimableError,
  InvalidInputError,
  InvalidTransitionError,
  TransitionConflictError,
  UniqueConflictError,
} from "./errors";
import { parseHandoffSummary } from "./handoff";
import type { ConversationsRepo, ConversationsStore } from "./repo";
import { canAiRespond, evaluateTransition } from "./stateMachine";
import type {
  Actor,
  ConversationChannel,
  ConversationMode,
  ConversationRecord,
  CustomerRecord,
  HandoffReason,
} from "./types";
import { HANDOFF_REASONS } from "./types";

// Serviço de conversas: criação, transições de estado (com auditoria) e
// encaminhamentos. Não envia mensagem nenhuma e não conhece o canal.

const MAX_REF_LENGTH = 80;
const MAX_REASON_LENGTH = 200;

function cleanActor(actor: Actor): Actor {
  const ref = actor.ref?.trim();
  if (actor.type === "HUMAN" && !ref) {
    throw new InvalidInputError("Informe quem é a pessoa da equipe (atendente).");
  }
  if (ref && ref.length > MAX_REF_LENGTH) {
    throw new InvalidInputError("Identificador do autor longo demais.");
  }
  return { type: actor.type, ref: ref || undefined };
}

function cleanReason(reason: string | undefined): string | null {
  const trimmed = reason?.trim();
  return trimmed ? trimmed.slice(0, MAX_REASON_LENGTH) : null;
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export type FindOrCreateConversationInput = {
  unitId: string;
  customer: Pick<CustomerRecord, "id">;
  channel?: ConversationChannel;
  /** Identificador da conversa/contato no canal, quando existir. */
  externalId?: string | null;
  now?: Date;
};

/**
 * Regra de reaproveitamento:
 *  - com `externalId`: a conversa daquele identificador (na mesma unidade e
 *    canal) ou uma nova;
 *  - sem `externalId`: a conversa mais recente do cliente naquele canal ou
 *    uma nova. (Uma conversa encerrada é reaberta, não duplicada.)
 */
export async function findOrCreateConversation(
  store: ConversationsStore,
  input: FindOrCreateConversationInput,
): Promise<{ conversation: ConversationRecord; created: boolean }> {
  const channel = input.channel ?? "WHATSAPP";
  const externalId = input.externalId?.trim() || null;
  const now = input.now ?? new Date();

  const find = (repo: ConversationsRepo) =>
    externalId
      ? repo.findConversationByExternalId(input.unitId, channel, externalId)
      : repo.findLatestConversation(input.customer.id, channel);

  const existing = await store.transaction(find);
  if (existing) return { conversation: existing, created: false };

  try {
    const conversation = await store.transaction((repo) =>
      repo.createConversation({
        unitId: input.unitId,
        customerId: input.customer.id,
        channel,
        // Sem id do canal, usa uma chave própria por cliente: assim duas
        // entregas simultâneas da primeira mensagem de um cliente novo batem na
        // restrição única (unidade, canal, externalId) e não criam duas
        // conversas (o que duplicaria a mensagem). Encontrado no teste de
        // integração da Fase 3.
        externalId: externalId ?? `customer:${input.customer.id}`,
        createdAt: now,
      }),
    );
    return { conversation, created: true };
  } catch (error) {
    if (!(error instanceof UniqueConflictError)) throw error;
    const winner = await store.transaction(find);
    if (!winner) throw error;
    return { conversation: winner, created: false };
  }
}

// ---------------------------------------------------------------------------
// Transições
// ---------------------------------------------------------------------------

type HandoffRequest = { reason: HandoffReason; summary: unknown };

export type TransitionParams = {
  conversationId: string;
  to: ConversationMode;
  actor: Actor;
  reason?: string;
  handoff?: HandoffRequest;
  now: Date;
};

export type TransitionResult = {
  conversation: ConversationRecord;
  handoffId: string | null;
};

// Executa UMA transição (o chamador já está dentro de uma transação): valida, troca o modo de forma
// atômica, cria o encaminhamento (quando exigido) e grava a trilha de auditoria.
export async function applyTransition(repo: ConversationsRepo, p: TransitionParams): Promise<TransitionResult> {
  const actor = cleanActor(p.actor);

  const conversation = await repo.findConversationById(p.conversationId);
  if (!conversation) throw new ConversationNotFoundError();

  const verdict = evaluateTransition(conversation.mode, p.to, actor);
  if (!verdict.ok) throw new InvalidTransitionError(verdict.message);

  if (verdict.requiresHandoff && !p.handoff) {
    throw new InvalidTransitionError("Passar para atendimento humano exige um encaminhamento com resumo.");
  }
  if (!verdict.requiresHandoff && p.handoff) {
    throw new InvalidTransitionError("Esta transição não cria encaminhamento.");
  }
  if (p.handoff && !HANDOFF_REASONS.includes(p.handoff.reason)) {
    throw new InvalidInputError("Motivo de encaminhamento inválido.");
  }
  // Valida o resumo ANTES de mexer no banco.
  const summary = p.handoff ? parseHandoffSummary(p.handoff.summary) : null;

  // Quem entra na conversa como HUMAN já a assume; nos demais casos o
  // encaminhamento fica aberto até alguém assumir.
  const takenBy = p.to === "HUMAN" && actor.type === "HUMAN" ? (actor.ref ?? null) : null;

  const changed = await repo.changeMode(conversation.id, conversation.mode, p.to, takenBy);
  if (!changed) throw new TransitionConflictError();

  let handoffId: string | null = null;
  if (p.handoff && summary) {
    const handoff = await repo.createHandoff({
      conversationId: conversation.id,
      reason: p.handoff.reason,
      summary,
      requestedBy: actor.type,
      requestedByRef: actor.ref ?? null,
      claimedBy: takenBy,
      claimedAt: takenBy ? p.now : null,
    });
    handoffId = handoff.id;
  }

  if (conversation.mode === "HUMAN" && p.to === "FINISHED") {
    await repo.resolveActiveHandoffs(conversation.id, p.now);
  }

  await repo.addTransition({
    conversationId: conversation.id,
    fromMode: conversation.mode,
    toMode: p.to,
    actor: actor.type,
    actorRef: actor.ref ?? null,
    reason: cleanReason(p.reason) ?? (p.handoff ? p.handoff.reason : null),
    handoffId,
    createdAt: p.now,
  });

  return {
    conversation: { ...conversation, mode: p.to, assignedTo: takenBy },
    handoffId,
  };
}

/** BOT → HUMAN. Sempre registra um Handoff com o resumo para a equipe. */
export function handoffToHuman(
  store: ConversationsStore,
  params: {
    conversationId: string;
    reason: HandoffReason;
    summary: unknown;
    actor: Actor;
    now?: Date;
  },
): Promise<TransitionResult> {
  return store.transaction((repo) =>
    applyTransition(repo, {
      conversationId: params.conversationId,
      to: "HUMAN",
      actor: params.actor,
      handoff: { reason: params.reason, summary: params.summary },
      now: params.now ?? new Date(),
    }),
  );
}

/** HUMAN → FINISHED. Resolve os encaminhamentos abertos; a IA pode ser retomada depois. */
export function finishConversation(
  store: ConversationsStore,
  params: { conversationId: string; actor: Actor; reason?: string; now?: Date },
): Promise<TransitionResult> {
  return store.transaction((repo) =>
    applyTransition(repo, {
      conversationId: params.conversationId,
      to: "FINISHED",
      actor: params.actor,
      reason: params.reason,
      now: params.now ?? new Date(),
    }),
  );
}

/** FINISHED → BOT. Retomada da IA (ex.: o cliente escreveu de novo). */
export function reopenConversation(
  store: ConversationsStore,
  params: { conversationId: string; actor: Actor; reason?: string; now?: Date },
): Promise<TransitionResult> {
  return store.transaction((repo) =>
    applyTransition(repo, {
      conversationId: params.conversationId,
      to: "BOT",
      actor: params.actor,
      reason: params.reason,
      now: params.now ?? new Date(),
    }),
  );
}

/**
 * Uma pessoa da equipe assume um encaminhamento que está em aberto (conversa
 * já em HUMAN). Não muda o modo; registra quem assumiu e quando.
 */
export function claimHandoff(
  store: ConversationsStore,
  params: { conversationId: string; by: string; now?: Date },
): Promise<void> {
  const by = params.by.trim();
  if (!by || by.length > MAX_REF_LENGTH) {
    return Promise.reject(new InvalidInputError("Informe quem está assumindo."));
  }

  return store.transaction(async (repo) => {
    const conversation = await repo.findConversationById(params.conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    if (conversation.mode !== "HUMAN") throw new HandoffNotClaimableError();

    const handoff = await repo.findActiveHandoff(conversation.id);
    if (!handoff || handoff.status !== "OPEN") throw new HandoffNotClaimableError();

    const claimed = await repo.claimHandoff(handoff.id, by, params.now ?? new Date());
    if (!claimed) throw new HandoffNotClaimableError();
    await repo.setAssignedTo(conversation.id, by);
  });
}

// ---------------------------------------------------------------------------
// Permissão para a IA responder
// ---------------------------------------------------------------------------

/**
 * Consulta barata para o agente fazer ANTES de gerar uma resposta. A garantia
 * forte fica na gravação (recordOutboundMessage recusa mensagem da IA quando a
 * conversa não está em BOT), porque o modo pode mudar enquanto a IA pensa.
 */
export async function checkAiMayRespond(
  store: ConversationsStore,
  conversationId: string,
): Promise<{ allowed: boolean; mode: ConversationMode }> {
  const conversation = await store.transaction((repo) => repo.findConversationById(conversationId));
  if (!conversation) throw new ConversationNotFoundError();
  return { allowed: canAiRespond(conversation.mode), mode: conversation.mode };
}
