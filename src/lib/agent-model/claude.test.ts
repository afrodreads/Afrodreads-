import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "../agent/tools";
import {
  ClaudeModelClient,
  createClaudeModelFromEnv,
  estimateCostUsd,
  InputTooLargeError,
  type MessagesClient,
} from "./claude";

// Adaptador real testado com um cliente FALSO: nenhuma chamada de rede, nenhuma chave.

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

function message(overrides: Partial<Anthropic.Beta.Messages.BetaMessage>): Anthropic.Beta.Messages.BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 8000, cache_creation_input_tokens: 0 },
    ...overrides,
  } as Anthropic.Beta.Messages.BetaMessage;
}

class FakeClient implements MessagesClient {
  calls: { params: Params; options?: { timeout?: number; maxRetries?: number } }[] = [];
  constructor(private readonly responses: Anthropic.Beta.Messages.BetaMessage[]) {}
  beta = {
    messages: {
      create: async (params: Params, options?: { timeout?: number; maxRetries?: number }) => {
        this.calls.push({ params, options });
        const next = this.responses.shift();
        if (!next) throw new Error("sem resposta roteirizada");
        return next;
      },
    },
  };
}

const PREFIX = "# 1. IDENTIDADE\n\nVocê é a atendente virtual.\n\n# REGRAS\n...";
const request = {
  system: `${PREFIX}\n\n---\n\n# DADOS DO SISTEMA\n- Agora: 01/10/2026`,
  systemCacheablePrefix: PREFIX,
  messages: [{ role: "user" as const, content: "Oi, quanto custa?" }],
  tools: TOOL_DEFINITIONS,
};

describe("adaptador Claude: requisição", () => {
  it("modelo, effort, fallback de segurança, ferramentas com schema e tool_choice auto", async () => {
    const client = new FakeClient([message({ content: [{ type: "text", text: "Oi! 💛", citations: null }] as never })]);
    const model = new ClaudeModelClient({ model: "claude-opus-5-5" }, client);
    await model.generate(request);

    const { params, options } = client.calls[0];
    assert.equal(params.model, "claude-opus-5-5");
    assert.equal(params.max_tokens, 8000);
    assert.deepEqual(params.output_config, { effort: "medium" });
    assert.deepEqual(params.tool_choice, { type: "auto" });
    assert.deepEqual((params as { betas?: string[] }).betas, ["server-side-fallback-2026-07-01"]);
    assert.equal((params as { fallbacks?: string }).fallbacks, "default");
    assert.deepEqual((params.tools ?? []).map((tool) => (tool as { name: string }).name), ["request_handoff", "update_lead_data"]);
    assert.ok((params.tools ?? []).every((tool) => "input_schema" in tool));
    assert.deepEqual(options, { timeout: 30_000, maxRetries: 1 });
  });

  it("cacheia só a parte fixa do prompt; os dados do momento vêm depois do ponto de cache", async () => {
    const client = new FakeClient([message({ content: [{ type: "text", text: "Oi" }] as never })]);
    await new ClaudeModelClient({ model: "claude-opus-5-5" }, client).generate(request);
    const system = client.calls[0].params.system as Anthropic.Beta.Messages.BetaTextBlockParam[];
    assert.equal(system.length, 2);
    assert.equal(system[0].text, PREFIX);
    assert.deepEqual(system[0].cache_control, { type: "ephemeral" });
    assert.match(system[1].text, /DADOS DO SISTEMA/);
    assert.equal(system[1].cache_control, undefined);
  });

  it("fallback de segurança pode ser desligado", async () => {
    const client = new FakeClient([message({ content: [{ type: "text", text: "Oi" }] as never })]);
    await new ClaudeModelClient({ model: "claude-opus-5-5", useFallbacks: false }, client).generate(request);
    assert.equal("fallbacks" in client.calls[0].params, false);
  });

  it("entrada acima do limite é recusada antes de qualquer chamada", async () => {
    const client = new FakeClient([]);
    const model = new ClaudeModelClient({ model: "claude-opus-5-5", maxInputChars: 50 }, client);
    await assert.rejects(() => model.generate(request), InputTooLargeError);
    assert.equal(client.calls.length, 0);
  });

  it("a conversa enviada sempre começa pelo cliente", async () => {
    const client = new FakeClient([message({ content: [{ type: "text", text: "Oi" }] as never })]);
    await new ClaudeModelClient({ model: "claude-opus-5-5" }, client).generate({
      ...request,
      messages: [
        { role: "assistant", content: "mensagem antiga da equipe" },
        { role: "user", content: "Oi" },
      ],
    });
    assert.equal(client.calls[0].params.messages[0].role, "user");
  });
});

describe("adaptador Claude: resposta, uso e custo", () => {
  it("texto, ferramentas, modelo servido, motivo de parada, tokens e custo estimado", async () => {
    const client = new FakeClient([
      message({
        content: [
          { type: "thinking", thinking: "", signature: "x" },
          { type: "text", text: "Me manda uma foto do cabelo. 💛" },
          { type: "tool_use", id: "t1", name: "update_lead_data", input: { intent: "ORCAMENTO" } },
        ] as never,
        stop_reason: "tool_use",
      }),
    ]);
    const response = await new ClaudeModelClient({ model: "claude-opus-5-5" }, client).generate(request);

    assert.equal(response.text, "Me manda uma foto do cabelo. 💛");
    assert.deepEqual(response.toolCalls, [{ name: "update_lead_data", arguments: { intent: "ORCAMENTO" } }]);
    assert.equal(response.servedModel, "claude-opus-5-5");
    assert.equal(response.stopReason, "tool_use");
    assert.deepEqual(response.usage, {
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 8000,
      cacheWriteTokens: 0,
      estimatedCostUsd: 0.0096, // 1000×4 + 200×20 + 8000×0,20 = 9.600 / 1M
    });
    assert.equal(client.calls.length, 1); // já tinha texto: sem rodada extra
  });

  it("só ferramenta e nenhum texto: UMA rodada extra com 'registrado' para obter a resposta (sem laço)", async () => {
    const client = new FakeClient([
      message({
        content: [{ type: "tool_use", id: "t1", name: "request_handoff", input: { reason: "QUOTE_REQUEST", summary: { headline: "x" } } }] as never,
        stop_reason: "tool_use",
      }),
      message({ content: [{ type: "text", text: "Já passei para a equipe. 💛" }] as never, stop_reason: "end_turn" }),
    ]);
    const response = await new ClaudeModelClient({ model: "claude-opus-5-5" }, client).generate(request);

    assert.equal(client.calls.length, 2);
    const second = client.calls[1].params.messages;
    assert.equal(second.at(-2)?.role, "assistant");
    const toolResult = (second.at(-1)?.content as { type: string; tool_use_id: string }[])[0];
    assert.equal(toolResult.type, "tool_result");
    assert.equal(toolResult.tool_use_id, "t1");
    assert.equal(response.text, "Já passei para a equipe. 💛");
    assert.equal(response.toolCalls.length, 1);
    assert.equal(response.usage?.inputTokens, 2000); // soma das duas chamadas
  });

  it("recusa e resposta cortada chegam ao orquestrador pelo motivo de parada", async () => {
    const client = new FakeClient([message({ content: [] as never, stop_reason: "refusal" })]);
    const response = await new ClaudeModelClient({ model: "claude-opus-5-5" }, client).generate(request);
    assert.equal(response.stopReason, "refusal");
    assert.equal(response.text, null);
  });

  it("custo pela tabela do modelo que respondeu; modelo fora da tabela = custo desconhecido", () => {
    assert.equal(estimateCostUsd("claude-sonnet-5-5", { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }), 2);
    assert.equal(estimateCostUsd("claude-opus-5-5", { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 1_000_000 }), 5);
    assert.equal(estimateCostUsd("modelo-desconhecido", { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }), null);
  });
});

describe("configuração pelo ambiente", () => {
  it("sem ANTHROPIC_API_KEY o modelo fica indisponível (o agente não roda)", () => {
    assert.equal(createClaudeModelFromEnv({}), null);
    assert.equal(createClaudeModelFromEnv({ ANTHROPIC_API_KEY: "   " }), null);
  });

  it("padrões seguros e limites para valores do ambiente", () => {
    const model = createClaudeModelFromEnv({ ANTHROPIC_API_KEY: "chave-de-teste", AGENT_TIMEOUT_MS: "999999", AGENT_MAX_TOKENS: "5", AGENT_EFFORT: "max" });
    assert.ok(model);
    assert.equal(model.id, "claude-opus-5-5");
    const config = (model as unknown as { config: { timeoutMs: number; maxTokens: number; effort: string; useFallbacks: boolean } }).config;
    assert.equal(config.timeoutMs, 55000);
    assert.equal(config.maxTokens, 1000);
    assert.equal(config.effort, "medium"); // valor fora da lista volta ao padrão
    assert.equal(config.useFallbacks, true);
    assert.equal(JSON.stringify(config).includes("chave-de-teste"), false); // a chave não fica na configuração
  });
});

describe("adaptador Claude: fotos do cliente", () => {
  const IMG = "https://manybot-files.s3.amazonaws.com/ref.jpg";
  const withPhoto = {
    ...request,
    messages: [
      { role: "user" as const, content: "Quero dreads" },
      { role: "assistant" as const, content: "Me manda uma referência?" },
      { role: "user" as const, content: "[O cliente enviou uma foto.]", imageUrl: IMG },
    ],
  };

  it("anexa a foto como imagem (link) antes do texto da mensagem", async () => {
    const client = new FakeClient([message({ content: [{ type: "text", text: "Vejo microlocs!", citations: null }] as never })]);
    await new ClaudeModelClient({ model: "claude-sonnet-5-5" }, client).generate(withPhoto);
    const last = client.calls[0].params.messages[2];
    assert.deepEqual(last.content, [
      { type: "image", source: { type: "url", url: IMG } },
      { type: "text", text: "[O cliente enviou uma foto.]" },
    ]);
    assert.equal(typeof client.calls[0].params.messages[0].content, "string");
  });

  it("anexa no máximo as 4 fotos mais recentes", async () => {
    const many = {
      ...request,
      messages: Array.from({ length: 6 }, (_, i) => ({ role: "user" as const, content: "foto " + i, imageUrl: IMG + "?" + i })),
    };
    const client = new FakeClient([message({ content: [{ type: "text", text: "ok", citations: null }] as never })]);
    await new ClaudeModelClient({ model: "claude-sonnet-5-5" }, client).generate(many);
    const withImage = client.calls[0].params.messages.filter((m) => Array.isArray(m.content));
    assert.equal(withImage.length, 4);
    assert.equal(typeof client.calls[0].params.messages[0].content, "string");
  });

  it("se a API recusar a imagem (400), responde de novo sem as fotos", async () => {
    const calls: Params[] = [];
    const client: MessagesClient = {
      beta: {
        messages: {
          create: async (params: Params) => {
            calls.push(params);
            if (calls.length === 1) throw new Anthropic.BadRequestError(400, { error: { message: "image" } }, "image", new Headers());
            return message({ content: [{ type: "text", text: "Recebi, obrigada!", citations: null }] as never });
          },
        },
      },
    };
    const response = await new ClaudeModelClient({ model: "claude-sonnet-5-5" }, client).generate(withPhoto);
    assert.equal(response.text, "Recebi, obrigada!");
    assert.equal(calls.length, 2);
    assert.equal(typeof calls[1].messages[2].content, "string");
  });

  it("erro 400 sem fotos na conversa não é engolido", async () => {
    const client: MessagesClient = {
      beta: {
        messages: {
          create: async () => {
            throw new Anthropic.BadRequestError(400, { error: { message: "x" } }, "x", new Headers());
          },
        },
      },
    };
    await assert.rejects(new ClaudeModelClient({ model: "claude-sonnet-5-5" }, client).generate(request));
  });
});
