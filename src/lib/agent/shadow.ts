import type { ConversationMode } from "../conversations/types";
import type { AgentStatus } from "./status";
import type { Violation } from "./guardrails";
import type { ProposedAction, ToolCallRequest } from "./tools";

// Modo sombra: o agente gera RASCUNHOS e eles ficam só neste registro. Um
// rascunho nunca vira Message, nunca é enviado e não muda a conversa. O registro
// serve para a equipe comparar o que a IA teria dito com o que foi dito.

export type ShadowOutcome =
  | "draft_saved" // rascunho limpo registrado
  | "draft_blocked" // guardrails barraram: texto trocado por fallback
  | "skipped_not_bot" // conversa em HUMAN/FINISHED: modelo nem foi chamado
  | "nothing_to_answer" // a última mensagem não é do cliente
  | "discarded_mode_changed" // o modo mudou enquanto o modelo gerava
  | "context_unavailable"
  | "model_error"
  | "duplicate"; // mesma mensagem-gatilho já processada (idempotência)

export type ShadowDraft = {
  conversationId: string;
  triggerMessageId: string;
  createdAt: Date;
  /** Texto que a IA TERIA enviado (já substituído pelo fallback se bloqueado). */
  text: string | null;
  /** Texto original do modelo quando o guardrail o bloqueou (só para análise interna). */
  blockedOriginalText: string | null;
  violations: Violation[];
  /** Ações que a IA pediu. Em sombra NADA é executado: ficam só registradas. */
  proposedActions: ProposedAction[];
  rejectedToolCalls: { name: string; reason: "unknown_tool" | "invalid_arguments" }[];
  context: { status: AgentStatus; mode: ConversationMode; activePromotions: number };
};

export type ShadowRunRecord = {
  key: string;
  conversationId: string;
  triggerMessageId: string;
  at: Date;
  outcome: ShadowOutcome;
  mode: ConversationMode | null;
  draft: ShadowDraft | null;
};

export interface ShadowSink {
  /** Reserva a execução da chave (idempotência). false = já processada/em processamento. */
  claim(key: string): Promise<boolean>;
  complete(record: ShadowRunRecord): Promise<void>;
}

export function runKey(conversationId: string, triggerMessageId: string): string {
  return `${conversationId}:${triggerMessageId}`;
}

export type { ToolCallRequest };
