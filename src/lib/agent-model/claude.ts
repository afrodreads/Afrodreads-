import Anthropic from "@anthropic-ai/sdk";
import type { ModelClient, ModelRequest, ModelResponse, ModelUsage } from "../agent/model";
import type { ToolCallRequest } from "../agent/tools";

// Adaptador REAL do modelo (Claude) atrás da porta ModelClient.
//
// O que ele faz: recebe o prompt montado pelo orquestrador e devolve o RASCUNHO
// (texto + ferramentas propostas + uso/custo). O que ele NÃO faz: enviar nada
// a cliente. Não existe aqui nenhum caminho para WhatsApp, ManyChat ou e-mail;
// a única rede é a chamada à API da Anthropic.
//
// Segurança: a chave vem só de variável de ambiente (lida em
// `createClaudeModelFromEnv`), nunca é registrada em log nem devolvida em erro.

/** Preços por milhão de tokens (US$), tabela oficial em 2026-09-25. */
export const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export function estimateCostUsd(
  model: string,
  usage: Pick<ModelUsage, "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheWriteTokens">,
): number | null {
  const price = PRICING_USD_PER_MTOK[model];
  if (!price) return null;
  const cost =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export type ClaudeConfig = {
  model: string;
  effort: "low" | "medium" | "high";
  /** Teto de tokens de saída por chamada (inclui o raciocínio do modelo). */
  maxTokens: number;
  /** Tempo máximo por chamada (ms). */
  timeoutMs: number;
  /** Novas tentativas automáticas do SDK (429/5xx/rede). */
  maxRetries: number;
  /** Limite de tamanho da entrada (caracteres de prompt + mensagens). */
  maxInputChars: number;
  /** Fallback do lado da Anthropic quando o modelo recusa por política. */
  useFallbacks: boolean;
};

export const DEFAULT_CLAUDE_CONFIG: Omit<ClaudeConfig, "model"> = Object.freeze({
  effort: "medium",
  maxTokens: 8000,
  timeoutMs: 30_000,
  maxRetries: 1,
  maxInputChars: 200_000,
  useFallbacks: true,
});

export class InputTooLargeError extends Error {
  constructor() {
    super("Entrada maior que o limite configurado para o modelo.");
    this.name = "InputTooLargeError";
  }
}

/** O pedaço do SDK que o adaptador usa (permite um cliente falso nos testes). */
export type MessagesClient = {
  beta: {
    messages: {
      create(
        params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
        options?: { timeout?: number; maxRetries?: number },
      ): Promise<Anthropic.Beta.Messages.BetaMessage>;
    };
  };
};

const SHADOW_TOOL_RESULT = "Registrado como proposta (modo sombra). Escreva agora a resposta ao cliente.";

export class ClaudeModelClient implements ModelClient {
  readonly id: string;
  private readonly config: ClaudeConfig;

  constructor(
    config: Partial<ClaudeConfig> & { model: string },
    private readonly client: MessagesClient,
  ) {
    this.config = { ...DEFAULT_CLAUDE_CONFIG, ...config };
    this.id = this.config.model;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const size = request.system.length + request.messages.reduce((sum, message) => sum + message.content.length, 0);
    if (size > this.config.maxInputChars) throw new InputTooLargeError();

    // Parte fixa do prompt cacheada; a parte dinâmica (dados do momento) depois dela.
    const prefix = request.systemCacheablePrefix;
    const system: Anthropic.Beta.Messages.BetaTextBlockParam[] =
      prefix && request.system.startsWith(prefix) && request.system.length > prefix.length
        ? [
            { type: "text", text: prefix, cache_control: { type: "ephemeral" } },
            { type: "text", text: request.system.slice(prefix.length) },
          ]
        : [{ type: "text", text: request.system }];

    const tools: Anthropic.Beta.Messages.BetaTool[] = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Beta.Messages.BetaTool.InputSchema,
    }));

    // A conversa enviada precisa começar pelo cliente.
    const firstUser = request.messages.findIndex((message) => message.role === "user");
    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = request.messages
      .slice(firstUser === -1 ? request.messages.length : firstUser)
      .map((message) => ({ role: message.role, content: message.content }));
    if (messages.length === 0) throw new InputTooLargeError();

    const base = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system,
      tools,
      tool_choice: { type: "auto" as const },
      output_config: { effort: this.config.effort },
      ...(this.config.useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    };
    const options = { timeout: this.config.timeoutMs, maxRetries: this.config.maxRetries };

    const first = await this.client.beta.messages.create({ ...base, messages }, options);
    const responses = [first];

    let text = textOf(first);
    const toolCalls = toolCallsOf(first);

    // Só ferramentas e nenhum texto: uma única rodada extra, devolvendo "registrado"
    // para cada ferramenta, para obter a resposta ao cliente. Sem laço.
    if (!text && first.stop_reason === "tool_use" && toolCalls.length > 0) {
      const toolResults: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = first.content
        .filter((block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === "tool_use")
        .map((block) => ({ type: "tool_result", tool_use_id: block.id, content: SHADOW_TOOL_RESULT }));
      const second = await this.client.beta.messages.create(
        {
          ...base,
          messages: [
            ...messages,
            { role: "assistant", content: first.content as Anthropic.Beta.Messages.BetaContentBlockParam[] },
            { role: "user", content: toolResults },
          ],
        },
        options,
      );
      responses.push(second);
      text = textOf(second);
      toolCalls.push(...toolCallsOf(second));
    }

    const final = responses[responses.length - 1];
    const usage = responses.reduce(
      (sum, response) => ({
        inputTokens: sum.inputTokens + (response.usage.input_tokens ?? 0),
        outputTokens: sum.outputTokens + (response.usage.output_tokens ?? 0),
        cacheReadTokens: sum.cacheReadTokens + (response.usage.cache_read_input_tokens ?? 0),
        cacheWriteTokens: sum.cacheWriteTokens + (response.usage.cache_creation_input_tokens ?? 0),
      }),
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    );

    return {
      text,
      toolCalls,
      usage: { ...usage, estimatedCostUsd: estimateCostUsd(final.model, usage) },
      servedModel: final.model,
      stopReason: final.stop_reason ?? undefined,
    };
  }
}

function textOf(message: Anthropic.Beta.Messages.BetaMessage): string | null {
  const text = message.content
    .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text || null;
}

function toolCallsOf(message: Anthropic.Beta.Messages.BetaMessage): ToolCallRequest[] {
  return message.content
    .filter((block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === "tool_use")
    .map((block) => ({ name: block.name, arguments: block.input }));
}

const EFFORTS = new Set(["low", "medium", "high"]);

/**
 * Monta o cliente real a partir do ambiente. Sem ANTHROPIC_API_KEY devolve
 * null (o agente não roda; as mensagens continuam sendo registradas).
 */
export function createClaudeModelFromEnv(env: Record<string, string | undefined> = process.env): ClaudeModelClient | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const intEnv = (value: string | undefined, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), min), max) : fallback;
  };
  const effort = env.AGENT_EFFORT && EFFORTS.has(env.AGENT_EFFORT) ? (env.AGENT_EFFORT as ClaudeConfig["effort"]) : "medium";
  return new ClaudeModelClient(
    {
      model: env.AGENT_MODEL?.trim() || "claude-opus-5-5",
      effort,
      maxTokens: intEnv(env.AGENT_MAX_TOKENS, DEFAULT_CLAUDE_CONFIG.maxTokens, 1000, 16000),
      timeoutMs: intEnv(env.AGENT_TIMEOUT_MS, DEFAULT_CLAUDE_CONFIG.timeoutMs, 5000, 55000),
      maxRetries: intEnv(env.AGENT_MAX_RETRIES, DEFAULT_CLAUDE_CONFIG.maxRetries, 0, 2),
      useFallbacks: env.AGENT_FALLBACKS !== "off",
    },
    new Anthropic({ apiKey }),
  );
}
