import type { ToolCallRequest, ToolDefinition } from "./tools";

// Porta do modelo de linguagem. O núcleo do agente não sabe qual provedor está
// por trás: a implementação real (Claude) fica em src/lib/agent-model/, e os
// testes usam um modelo roteirizado. Em qualquer caso o agente só GERA rascunho:
// nada aqui envia mensagem a cliente.

export type ModelMessage = {
  role: "user" | "assistant";
  content: string;
  /** Foto enviada pelo cliente (link do canal), anexada como imagem quando o adaptador suporta. */
  imageUrl?: string;
};

export type ModelRequest = {
  /** Prompt de sistema completo (parte fixa + parte dinâmica). */
  system: string;
  /**
   * Início de `system` que não muda entre conversas (V2 + regras + ferramentas).
   * O adaptador pode cachear este trecho; o restante (dados do momento) vem depois.
   */
  systemCacheablePrefix?: string;
  messages: ModelMessage[];
  tools: ToolDefinition[];
};

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Custo estimado em US$ pela tabela de preços do adaptador (null se o modelo não estiver na tabela). */
  estimatedCostUsd: number | null;
};

export type ModelResponse = {
  /** Texto do rascunho de resposta (pode vir vazio se só houver ferramentas). */
  text: string | null;
  toolCalls: ToolCallRequest[];
  /** Uso e custo, quando o provedor informa. */
  usage?: ModelUsage;
  /** Modelo que efetivamente respondeu (pode diferir em caso de fallback do provedor). */
  servedModel?: string;
  /** Motivo de parada informado pelo provedor (ex.: end_turn, max_tokens, refusal). */
  stopReason?: string;
};

export interface ModelClient {
  /** Identificador do modelo configurado (registrado em cada AgentRun). */
  readonly id: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}
