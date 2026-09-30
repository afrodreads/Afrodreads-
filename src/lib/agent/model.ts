import type { ToolCallRequest, ToolDefinition } from "./tools";

// Porta do modelo de linguagem. Nesta fase NÃO existe implementação real: não
// há cliente da API do Claude, nem chamada de rede. Os testes usam um modelo
// roteirizado (testSupport.ts). Uma implementação real é assunto de fase futura.

export type ModelMessage = { role: "user" | "assistant"; content: string };

export type ModelRequest = {
  system: string;
  messages: ModelMessage[];
  tools: ToolDefinition[];
};

export type ModelResponse = {
  /** Texto do rascunho de resposta (pode vir vazio se só houver ferramentas). */
  text: string | null;
  toolCalls: ToolCallRequest[];
};

export interface ModelClient {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
