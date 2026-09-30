import type { ConversationMode } from "../conversations/types";
import type { AgentStatus } from "./status";
import type { Violation } from "./guardrails";
import type { LeadData, ProposedAction } from "./tools";

// Registro persistente de cada execução do agente (AgentRun). Sempre em modo
// sombra: um AgentRun é o que a IA TERIA feito, nunca uma mensagem enviada.
// Guarda o suficiente para reconstruir a decisão (contexto, versão do prompt,
// modelo, ferramentas, guardrails, tempo) e nada de segredos.

export type AgentRunOutcome =
  | "DRAFT_SAVED" // rascunho limpo
  | "DRAFT_BLOCKED" // guardrails barraram: texto trocado por fallback
  | "NOTHING_TO_ANSWER" // a mensagem-gatilho não é a última do cliente
  | "DISCARDED_MODE_CHANGED" // o modo mudou enquanto o modelo gerava
  | "CONTEXT_UNAVAILABLE"
  | "MODEL_ERROR"
  | "INTERNAL_ERROR";

export type AgentRunTrigger = "INBOUND" | "REPLAY";

export type NewAgentRun = {
  idempotencyKey: string;
  unitId: string;
  conversationId: string;
  triggerMessageId: string;
  trigger: AgentRunTrigger;
  replayOfRunId: string | null;
  replayLabel: string | null;
  modelId: string;
  promptVersionId: string;
  startedAt: Date;
};

export type ProposedHandoff = Extract<ProposedAction, { tool: "request_handoff" }>;

export type AgentRunResult = {
  outcome: AgentRunOutcome;
  agentStatus: AgentStatus | null;
  mode: ConversationMode | null;
  intent: string | null;
  temperature: string | null;
  qualification: LeadData | null;
  candidateText: string | null;
  blockedOriginalText: string | null;
  guardrailOk: boolean | null;
  violations: Violation[];
  proposedHandoff: { reason: string; summary: unknown } | null;
  proposedActions: ProposedAction[];
  rejectedToolCalls: { name: string; reason: "unknown_tool" | "invalid_arguments" }[];
  contextSnapshot: Record<string, unknown> | null;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  completedAt: Date;
};

export type StoredAgentRun = NewAgentRun &
  Partial<AgentRunResult> & {
    id: string;
    promptVersion: { name: string; sha256: string } | null;
  };

export interface AgentRunStore {
  /** Cria a execução; a chave de idempotência é única. created=false = já existia. */
  create(run: NewAgentRun): Promise<{ created: boolean; id: string }>;
  complete(id: string, result: AgentRunResult): Promise<void>;
  find(id: string): Promise<StoredAgentRun | null>;
  /** Todas as execuções de uma mensagem (inbound e replays), mais antigas primeiro. */
  listForMessage(messageId: string): Promise<StoredAgentRun[]>;
}

export const inboundRunKey = (messageId: string) => `inbound:${messageId}`;

export const replayRunKey = (args: { messageId: string; promptSha256: string; modelId: string; label: string }) =>
  `replay:${args.messageId}:${args.promptSha256}:${args.modelId}:${args.label}`;

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{6,}/g, // chaves estilo "sk-..."
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(api[_-]?key|token|secret|password|senha)\s*[:=]\s*\S+/gi,
  /postgres(ql)?:\/\/\S+/gi,
];

/** Texto de erro seguro para guardar: sem segredos e curto. */
export function sanitizeError(error: unknown): { code: string; message: string } {
  const code = error instanceof Error ? error.name || "Error" : "Error";
  let message = error instanceof Error ? error.message : String(error);
  for (const pattern of SECRET_PATTERNS) message = message.replace(pattern, "[redacted]");
  return { code: code.slice(0, 60), message: message.slice(0, 300) };
}
