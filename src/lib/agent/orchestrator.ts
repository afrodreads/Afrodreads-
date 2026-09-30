import { checkAiMayRespond } from "../conversations/conversation";
import type { ConversationsStore } from "../conversations/repo";
import { assertShadowMode } from "./config";
import { buildAgentContext, type AgentContext, type AgentContextReader } from "./context";
import { checkDraft } from "./guardrails";
import type { ModelClient } from "./model";
import { buildSystemPrompt, type PromptSource } from "./prompt";
import { runKey, type ShadowDraft, type ShadowOutcome, type ShadowRunRecord, type ShadowSink } from "./shadow";
import { parseToolCall, TOOL_DEFINITIONS, type ProposedAction } from "./tools";

// Orquestrador do agente em MODO SOMBRA.
//
// O que ele faz: decide se a IA pode falar, monta o contexto, chama o modelo,
// confere o rascunho nos guardrails e REGISTRA o resultado.
//
// O que ele NÃO faz e NÃO consegue fazer (não há dependência para isso): enviar
// mensagem, gravar Message, mudar o modo da conversa, executar handoff, mexer em
// agenda, pagamento ou estorno. As dependências abaixo não incluem nenhum
// remetente nem escrita de negócio.

export type ShadowRunDeps = {
  config: { mode: string };
  /** Usado só para LER o modo da conversa (HUMAN bloqueia a IA). */
  store: ConversationsStore;
  reader: AgentContextReader;
  model: ModelClient;
  promptSource: PromptSource;
  sink: ShadowSink;
};

export type ShadowRunInput = { conversationId: string; triggerMessageId: string; now?: Date };

export type ShadowRunResult = { outcome: ShadowOutcome; draft: ShadowDraft | null; duplicate: boolean };

function fallbackText(context: AgentContext): string {
  const who = context.unit.humanName ?? "a equipe";
  return `Essa informação eu prefiro confirmar com a equipe para não te passar nada errado. Vou encaminhar para ${who}. 💛`;
}

export async function runAgentShadow(deps: ShadowRunDeps, input: ShadowRunInput): Promise<ShadowRunResult> {
  assertShadowMode(deps.config);

  const now = input.now ?? new Date();
  const key = runKey(input.conversationId, input.triggerMessageId);

  // Idempotência: a mesma mensagem-gatilho processada duas vezes (reentrega do
  // webhook, retry) gera um único rascunho e uma única chamada ao modelo.
  if (!(await deps.sink.claim(key))) return { outcome: "duplicate", draft: null, duplicate: true };

  const finish = async (
    outcome: ShadowOutcome,
    mode: ShadowRunRecord["mode"],
    draft: ShadowDraft | null = null,
  ): Promise<ShadowRunResult> => {
    await deps.sink.complete({
      key,
      conversationId: input.conversationId,
      triggerMessageId: input.triggerMessageId,
      at: now,
      outcome,
      mode,
      draft,
    });
    return { outcome, draft, duplicate: false };
  };

  // HUMAN (e FINISHED) bloqueiam a IA por completo: o modelo nem é chamado.
  const gate = await checkAiMayRespond(deps.store, input.conversationId);
  if (!gate.allowed) return finish("skipped_not_bot", gate.mode);

  const raw = await deps.reader.load(input.conversationId);
  if (!raw) return finish("context_unavailable", gate.mode);

  const context = buildAgentContext(raw, now);
  const last = context.messages[context.messages.length - 1];
  if (!last || last.role !== "user") return finish("nothing_to_answer", gate.mode);

  let response;
  try {
    response = await deps.model.generate({
      system: await buildSystemPrompt(deps.promptSource, context),
      messages: context.messages.map((message) => ({ role: message.role, content: message.text })),
      tools: TOOL_DEFINITIONS,
    });
  } catch {
    return finish("model_error", gate.mode);
  }

  // O modo pode ter mudado enquanto o modelo gerava (a equipe assumiu): descarta.
  const after = await checkAiMayRespond(deps.store, input.conversationId);
  if (!after.allowed) return finish("discarded_mode_changed", after.mode);

  const proposedActions: ProposedAction[] = [];
  const rejectedToolCalls: ShadowDraft["rejectedToolCalls"] = [];
  for (const call of response.toolCalls) {
    const parsed = parseToolCall(call);
    if (parsed.ok) proposedActions.push(parsed.action);
    else rejectedToolCalls.push({ name: parsed.name, reason: parsed.reason });
  }

  const originalText = response.text?.trim() ? response.text.trim() : null;
  const verdict = originalText ? checkDraft(originalText, context) : { ok: true, violations: [] };

  let text = originalText;
  let blockedOriginalText: string | null = null;
  if (!verdict.ok) {
    blockedOriginalText = originalText;
    text = fallbackText(context);
    // Um rascunho barrado vira proposta de encaminhamento, para a equipe ver.
    proposedActions.push({
      tool: "request_handoff",
      reason: "AI_UNCERTAIN",
      summary: {
        headline: "Rascunho da IA bloqueado pelos guardrails",
        collected: { violacoes: [...new Set(verdict.violations.map((v) => v.code))].join(", ").slice(0, 300) },
      },
    });
  }

  const draft: ShadowDraft = {
    conversationId: input.conversationId,
    triggerMessageId: input.triggerMessageId,
    createdAt: now,
    text,
    blockedOriginalText,
    violations: verdict.violations,
    proposedActions,
    rejectedToolCalls,
    context: { status: context.status, mode: context.mode, activePromotions: context.promotions.length },
  };

  return finish(verdict.ok ? "draft_saved" : "draft_blocked", after.mode, draft);
}
