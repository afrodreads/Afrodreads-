// Agrupamento de mensagens seguidas ("Oi" / "Queria colocar dread" / "Até a
// cintura" / "Quanto fica?"): em vez de uma execução por mensagem, espera um
// curto período de silêncio e responde tudo de uma vez.
//
// Regra (debounce com teto):
//  - cada mensagem recebida agenda uma verificação depois de `quietMs`;
//  - na verificação, se chegou mensagem MAIS NOVA do cliente, esta é "agrupada"
//    (a mais nova vai responder tudo junto);
//  - mas se a mensagem mais antiga ainda sem resposta já espera há `maxWaitMs`,
//    processa assim mesmo: nunca segura a conversa indefinidamente.

export type GroupingPolicy = {
  /** Silêncio esperado antes de responder (ms). */
  quietMs: number;
  /** Espera máxima desde a primeira mensagem sem resposta (ms). */
  maxWaitMs: number;
};

export const DEFAULT_GROUPING: GroupingPolicy = Object.freeze({ quietMs: 4000, maxWaitMs: 20000 });

/** Limites duros: a configuração nunca consegue travar o processamento. */
export const GROUPING_LIMITS = Object.freeze({ maxQuietMs: 15000, maxWaitMs: 30000 });

export function normalizeGroupingPolicy(policy: Partial<GroupingPolicy> = {}): GroupingPolicy {
  const finite = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  const quietMs = Math.min(finite(policy.quietMs, DEFAULT_GROUPING.quietMs), GROUPING_LIMITS.maxQuietMs);
  const maxWaitMs = Math.min(Math.max(finite(policy.maxWaitMs, DEFAULT_GROUPING.maxWaitMs), quietMs), GROUPING_LIMITS.maxWaitMs);
  return { quietMs, maxWaitMs };
}

export type PendingCustomerMessage = { id: string; createdAt: Date };

export type GroupingDecision = "process" | "grouped";

/**
 * `pending`: mensagens do cliente depois da última resposta (IA, equipe ou
 * sistema), da mais antiga para a mais nova.
 */
export function decideGrouping(input: {
  triggerMessageId: string;
  pending: PendingCustomerMessage[];
  now: Date;
  policy: GroupingPolicy;
}): GroupingDecision {
  const latest = input.pending[input.pending.length - 1];
  if (!latest || latest.id === input.triggerMessageId) return "process";
  const oldest = input.pending[0];
  if (input.now.getTime() - oldest.createdAt.getTime() >= input.policy.maxWaitMs) return "process";
  return "grouped";
}

export interface GroupingReader {
  /** Mensagens do cliente desde a última mensagem enviada (qualquer remetente), da mais antiga para a mais nova. */
  pendingCustomerMessages(conversationId: string): Promise<PendingCustomerMessage[]>;
}
