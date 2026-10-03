import { checkAiMayRespond } from "../conversations/conversation";
import { InvalidInputError } from "../conversations/errors";
import type { ConversationsStore } from "../conversations/repo";
import { assertShadowMode } from "./config";
import { buildAgentContext, contextSnapshot, type AgentContext, type AgentContextReader } from "./context";
import { toWhatsappText } from "./format";
import { checkDraft, type GuardrailResult } from "./guardrails";
import type { ModelClient, ModelResponse } from "./model";
import { buildSystemPrompt, type PromptSource } from "./prompt";
import type { PromptRegistry } from "./promptVersion";
import { redactForModel } from "./redact";
import {
  inboundRunKey,
  replayRunKey,
  sanitizeError,
  type AgentRunOutcome,
  type AgentRunResult,
  type AgentRunStore,
  type AgentRunTrigger,
} from "./runs";
import { parseToolCall, TOOL_DEFINITIONS, type LeadData, type ProposedAction } from "./tools";

// Orquestrador do agente em MODO SOMBRA:
//
//   INPUT → CONTEXT → MODEL → TOOLS → GUARDRAILS → SHADOW RESULT → AgentRun
//
// Nunca → Message OUTBOUND. As dependências abaixo não incluem nenhum remetente
// nem escrita de negócio: não há como enviar mensagem, mudar a conversa, criar
// handoff real, mexer em agenda ou pagamento. As ferramentas só PROPÕEM.

export type CoreDeps = {
  config: { mode: string };
  reader: AgentContextReader;
  model: ModelClient;
  prompt: PromptSource;
  prompts: PromptRegistry;
  runs: AgentRunStore;
  /** Relógio em ms para medir a duração (injetável nos testes). */
  clock?: () => number;
};

/** Execução ao vivo (sombra): também LÊ o modo atual da conversa. */
export type LiveDeps = CoreDeps & { store: ConversationsStore };

export type RunOutcome = AgentRunOutcome | "SKIPPED_NOT_BOT" | "DUPLICATE" | "NO_CONTEXT";

export type RunResult = { outcome: RunOutcome; runId: string | null; result: AgentRunResult | null };

function fallbackText(context: AgentContext): string {
  const who = context.unit.humanName ?? "a equipe";
  return `Essa informação eu prefiro confirmar com a equipe para não te passar nada errado. Vou encaminhar para ${who}. 💛`;
}

function fallbackHandoff(headline: string, detail?: string): ProposedAction {
  return {
    tool: "request_handoff",
    reason: "AI_UNCERTAIN",
    summary: { headline, ...(detail ? { collected: { detalhe: detail.slice(0, 300) } } : {}) },
  };
}

function emptyResult(outcome: AgentRunOutcome, durationMs: number, now: Date): AgentRunResult {
  return {
    outcome,
    agentStatus: null,
    mode: null,
    intent: null,
    temperature: null,
    qualification: null,
    candidateText: null,
    blockedOriginalText: null,
    guardrailOk: null,
    violations: [],
    proposedHandoff: null,
    proposedActions: [],
    rejectedToolCalls: [],
    contextSnapshot: null,
    durationMs,
    errorCode: null,
    errorMessage: null,
    completedAt: now,
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    estimatedCostUsd: null,
    servedModel: null,
    stopReason: null,
    groupedMessageCount: null,
  };
}

function usageFields(response: ModelResponse) {
  return {
    inputTokens: response.usage?.inputTokens ?? null,
    outputTokens: response.usage?.outputTokens ?? null,
    cacheReadTokens: response.usage?.cacheReadTokens ?? null,
    cacheWriteTokens: response.usage?.cacheWriteTokens ?? null,
    estimatedCostUsd: response.usage?.estimatedCostUsd ?? null,
    servedModel: response.servedModel ?? null,
    stopReason: response.stopReason ?? null,
  };
}

/** Mensagens do cliente desde a última resposta (o que esta execução responde junto). */
function trailingCustomerMessages(context: AgentContext): number {
  let count = 0;
  for (let i = context.messages.length - 1; i >= 0 && context.messages[i].role === "user"; i--) count += 1;
  return count;
}

type ExecuteArgs = {
  key: (promptSha256: string) => string;
  trigger: AgentRunTrigger;
  conversationId: string;
  triggerMessageId: string;
  replayOfRunId: string | null;
  replayLabel: string | null;
  now: Date;
  /** Replay: usa o modo da conversa no momento da mensagem (e não o atual). */
  historical: boolean;
  /** Ao vivo: relê o modo depois do modelo (a equipe pode ter assumido). */
  stillAllowed?: () => Promise<boolean>;
};

async function execute(deps: CoreDeps, args: ExecuteArgs): Promise<RunResult> {
  const clock = deps.clock ?? Date.now;

  // INPUT → CONTEXT (lido até a mensagem-gatilho)
  const raw = await deps.reader.load(args.conversationId, { upToMessageId: args.triggerMessageId });
  if (!raw) return { outcome: "NO_CONTEXT", runId: null, result: null };

  const context = buildAgentContext(raw, args.now, { useModeAtTrigger: args.historical });
  // HUMAN/FINISHED naquele momento: a IA não responde, então não há execução.
  if (context.mode !== "BOT") return { outcome: "SKIPPED_NOT_BOT", runId: null, result: null };

  const spec = await deps.prompt.load();
  const promptVersionId = await deps.prompts.ensure(spec);

  const created = await deps.runs.create({
    idempotencyKey: args.key(spec.sha256),
    unitId: raw.unitId,
    conversationId: args.conversationId,
    triggerMessageId: args.triggerMessageId,
    trigger: args.trigger,
    replayOfRunId: args.replayOfRunId,
    replayLabel: args.replayLabel,
    modelId: deps.model.id,
    promptVersionId,
    startedAt: args.now,
  });
  if (!created.created) return { outcome: "DUPLICATE", runId: created.id, result: null };

  const started = clock();
  const finish = async (result: AgentRunResult): Promise<RunResult> => {
    await deps.runs.complete(created.id, result);
    return { outcome: result.outcome, runId: created.id, result };
  };
  const elapsed = () => Math.max(0, Math.round(clock() - started));

  try {
    // O modelo recebe o texto do cliente SEM dados sensíveis (CPF, cartão, conta, senha, tokens).
    let redactedFragments = 0;
    const modelMessages = context.messages.map((message) => {
      const { text, redactions } = redactForModel(message.text);
      redactedFragments += redactions;
      return { role: message.role, content: text };
    });

    const base: AgentRunResult = {
      ...emptyResult("NOTHING_TO_ANSWER", 0, args.now),
      agentStatus: context.status,
      mode: context.mode,
      contextSnapshot: { ...contextSnapshot(context), redactedFragments },
      groupedMessageCount: trailingCustomerMessages(context),
    };

    const last = context.messages[context.messages.length - 1];
    if (!last || last.role !== "user" || last.id !== args.triggerMessageId) {
      return finish({ ...base, outcome: "NOTHING_TO_ANSWER", durationMs: elapsed() });
    }

    // MODEL
    const prompt = buildSystemPrompt(spec, context);
    let response: ModelResponse;
    try {
      response = await deps.model.generate({
        system: prompt.system,
        systemCacheablePrefix: prompt.cacheablePrefix,
        messages: modelMessages,
        tools: TOOL_DEFINITIONS,
      });
    } catch (error) {
      // Falha do modelo: fallback seguro + proposta de encaminhamento (nada é enviado).
      const safe = sanitizeError(error);
      const handoff = fallbackHandoff("Falha ao gerar resposta automática", safe.code);
      return finish({
        ...base,
        outcome: "MODEL_ERROR",
        candidateText: fallbackText(context),
        proposedHandoff: handoff.tool === "request_handoff" ? { reason: handoff.reason, summary: handoff.summary } : null,
        proposedActions: [handoff],
        durationMs: elapsed(),
        errorCode: safe.code,
        errorMessage: safe.message,
      });
    }

    if (args.stillAllowed && !(await args.stillAllowed())) {
      return finish({ ...base, ...usageFields(response), outcome: "DISCARDED_MODE_CHANGED", durationMs: elapsed() });
    }

    // TOOLS (só propostas)
    const proposedActions: ProposedAction[] = [];
    const rejectedToolCalls: AgentRunResult["rejectedToolCalls"] = [];
    for (const call of response.toolCalls) {
      const parsed = parseToolCall(call);
      if (parsed.ok) proposedActions.push(parsed.action);
      else rejectedToolCalls.push({ name: parsed.name, reason: parsed.reason });
    }

    let qualification: LeadData | null = null;
    for (const action of proposedActions) {
      if (action.tool === "update_lead_data") qualification = { ...(qualification ?? {}), ...action.data };
    }

    // GUARDRAILS (inclui recusa e resposta cortada do provedor)
    const originalText = response.text?.trim() ? toWhatsappText(response.text.trim()) : null;
    let verdict: GuardrailResult = originalText ? checkDraft(originalText, context) : { ok: true, violations: [] };
    if (response.stopReason === "refusal") {
      verdict = { ok: false, violations: [...verdict.violations, { code: "model_refusal", severity: "block", excerpt: "" }] };
    } else if (response.stopReason === "max_tokens") {
      verdict = { ok: false, violations: [...verdict.violations, { code: "truncated_response", severity: "block", excerpt: "" }] };
    }

    let candidateText = originalText;
    let blockedOriginalText: string | null = null;
    if (!verdict.ok) {
      blockedOriginalText = originalText;
      candidateText = fallbackText(context);
      proposedActions.push(
        fallbackHandoff(
          "Rascunho da IA bloqueado pelos guardrails",
          [...new Set(verdict.violations.map((v) => v.code))].join(", "),
        ),
      );
    } else if (!originalText) {
      // Só ferramentas, sem texto: o cliente receberia a mensagem de encaminhamento.
      candidateText = fallbackText(context);
      if (!proposedActions.some((action) => action.tool === "request_handoff")) {
        proposedActions.push(fallbackHandoff("A IA não produziu texto de resposta"));
      }
    }

    const handoff = proposedActions.find((action) => action.tool === "request_handoff");

    // SHADOW RESULT → AgentRun
    return finish({
      ...base,
      ...usageFields(response),
      outcome: verdict.ok ? "DRAFT_SAVED" : "DRAFT_BLOCKED",
      intent: qualification?.intent ?? null,
      temperature: qualification?.temperature ?? null,
      qualification,
      candidateText,
      blockedOriginalText,
      guardrailOk: verdict.ok,
      violations: verdict.violations,
      proposedHandoff: handoff && handoff.tool === "request_handoff" ? { reason: handoff.reason, summary: handoff.summary } : null,
      proposedActions,
      rejectedToolCalls,
      durationMs: elapsed(),
    });
  } catch (error) {
    const safe = sanitizeError(error);
    return finish({
      ...emptyResult("INTERNAL_ERROR", elapsed(), args.now),
      errorCode: safe.code,
      errorMessage: safe.message,
    });
  }
}

/**
 * Execução para uma mensagem nova do cliente (sombra). Em HUMAN/FINISHED o
 * modelo NÃO é chamado e NENHUM AgentRun é criado.
 */
export async function runAgentShadow(
  deps: LiveDeps,
  input: { conversationId: string; triggerMessageId: string; now?: Date },
): Promise<RunResult> {
  assertShadowMode(deps.config);
  const now = input.now ?? new Date();

  const gate = await checkAiMayRespond(deps.store, input.conversationId);
  if (!gate.allowed) return { outcome: "SKIPPED_NOT_BOT", runId: null, result: null };

  return execute(deps, {
    key: () => inboundRunKey(input.triggerMessageId),
    trigger: "INBOUND",
    conversationId: input.conversationId,
    triggerMessageId: input.triggerMessageId,
    replayOfRunId: null,
    replayLabel: null,
    now,
    historical: false,
    stillAllowed: async () => (await checkAiMayRespond(deps.store, input.conversationId)).allowed,
  });
}

export type ReplayDeps = CoreDeps & {
  messages: { findMessage(id: string): Promise<{ id: string; conversationId: string; sender: string; createdAt: Date } | null> };
};

/**
 * REPLAY interno: reexecuta o agente em sombra para uma mensagem já salva (ou
 * para a mensagem de um AgentRun), com o prompt/modelo das dependências. Não
 * recebe ConversationsStore: não há como alterar conversa, criar handoff real,
 * enviar mensagem, mexer em agendamento ou pagamento. Grava só um AgentRun
 * (trigger REPLAY). Idempotente por (mensagem, prompt, modelo, rótulo).
 *
 * O contexto é reconstruído como era no momento da mensagem: mensagens e
 * transições posteriores ficam de fora, e a data de referência é a da mensagem.
 */
export async function replayAgentRun(
  deps: ReplayDeps,
  input: { messageId?: string; sourceRunId?: string; label: string; now?: Date },
): Promise<RunResult> {
  assertShadowMode(deps.config);
  const label = input.label.trim();
  if (!label || label.length > 60) throw new InvalidInputError("Informe um rótulo curto para o replay.");

  let messageId = input.messageId ?? null;
  let replayOfRunId: string | null = null;
  if (input.sourceRunId) {
    const source = await deps.runs.find(input.sourceRunId);
    if (!source) throw new InvalidInputError("AgentRun de origem não encontrado.");
    messageId = source.triggerMessageId;
    replayOfRunId = source.id;
  }
  if (!messageId) throw new InvalidInputError("Informe a mensagem ou o AgentRun de origem.");

  const message = await deps.messages.findMessage(messageId);
  if (!message) throw new InvalidInputError("Mensagem não encontrada.");
  if (message.sender !== "CUSTOMER") throw new InvalidInputError("Replay só para mensagens do cliente.");

  const target = messageId;
  return execute(deps, {
    key: (promptSha256) => replayRunKey({ messageId: target, promptSha256, modelId: deps.model.id, label }),
    trigger: "REPLAY",
    conversationId: message.conversationId,
    triggerMessageId: target,
    replayOfRunId,
    replayLabel: label,
    now: input.now ?? message.createdAt,
    historical: true,
  });
}
