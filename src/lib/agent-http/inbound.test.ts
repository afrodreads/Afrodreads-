import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { finishConversation, handoffToHuman } from "../conversations/conversation";
import { findOrCreateCustomer } from "../conversations/customer";
import { processAfterQuietPeriod } from "../agent/pipeline";
import { agentHarness, MemoryGroupingReader, replyWith, ScriptedModel } from "../agent/testSupport";
import { AUDIO_PREFIX, IMAGE_PLACEHOLDER, createInboundHandler, derivedMessageId, MAX_TEXT_CHARS, MEDIA_PLACEHOLDER, type InboundConfig } from "./inbound";
import { FixedWindowLimiter } from "./security";
import type { MediaResult } from "../agent-media/transcribe";

// Simula o ManyChat chamando POST /api/agent/inbound (modo sombra).

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres!";
const NOW = new Date("2026-10-01T15:30:00-03:00");
const STAFF = { type: "HUMAN", ref: "atendente-1" } as const;

let networkCalls = 0;
const originalFetch = globalThis.fetch;
beforeEach(() => {
  networkCalls = 0;
  globalThis.fetch = (async () => {
    networkCalls += 1;
    throw new Error("rede proibida");
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Payload no formato do External Request do ManyChat (ver docs/agent-phase4a.md). */
const payload = (overrides: Record<string, unknown> = {}) => ({
  channel: "whatsapp",
  messageId: "wamid.HBgM001",
  contactId: "mc-123456",
  phone: "+55 11 98765-4321",
  name: "Maria",
  text: "Oi, tudo bem?",
  timestamp: NOW.toISOString(),
  ...overrides,
});

function setup(options: { model?: ScriptedModel; config?: Partial<InboundConfig>; withModel?: boolean; ipLimiter?: FixedWindowLimiter; noUnit?: boolean; transcribe?: (url: string) => Promise<MediaResult> } = {}) {
  const model = options.model ?? replyWith("Oi! Me conta o que você está procurando. 💛", [
    { name: "update_lead_data", arguments: { intent: "INFORMACAO", temperature: "FRIO" } },
  ]);
  const h = agentHarness(model);
  const config: InboundConfig = {
    enabled: true,
    secret: SECRET,
    unitSlug: null,
    maxAgeMs: 10 * 60_000,
    maxFutureMs: 2 * 60_000,
    contactLimitPerMinute: 20,
    ipLimitPerMinute: 300,
    grouping: { quietMs: 0, maxWaitMs: 0 },
    ...options.config,
  };
  const tasks: (() => Promise<void>)[] = [];
  const logs: string[] = [];
  let clock = NOW;
  const grouping = new MemoryGroupingReader(h.db);

  const handler = createInboundHandler({
    config,
    conversations: h.db,
    resolveUnitId: async () => (options.noUnit ? null : h.unit.id),
    countRecentForContact: async (unitId, contactId, since) =>
      h.db.messages.filter((m) => {
        const conversation = h.db.conversations.find((c) => c.id === m.conversationId);
        return m.direction === "INBOUND" && conversation?.unitId === unitId && conversation.externalId === contactId && m.createdAt >= since;
      }).length,
    lastInboundForContact: async (unitId, contactId) => {
      const conversation = h.db.conversations.find((c) => c.unitId === unitId && c.externalId === contactId);
      const inbound = h.db.messages.filter((m) => m.conversationId === conversation?.id && m.direction === "INBOUND");
      const last = inbound[inbound.length - 1];
      if (!last) return null;
      const answered = h.db.messages.some((m) => m.conversationId === last.conversationId && m.direction === "OUTBOUND" && m.createdAt >= last.createdAt);
      return { text: last.content, answered };
    },
    transcribeMedia: options.transcribe,
    mediaMessageExists: async (unitId, contactId, externalMessageId) => {
      const conversation = h.db.conversations.find((c) => c.unitId === unitId && c.externalId === contactId);
      return h.db.messages.some((m) => m.conversationId === conversation?.id && m.externalId === externalMessageId);
    },
    processJob:
      options.withModel === false
        ? null
        : (job) => processAfterQuietPeriod({ agent: h.live, grouping }, job, { policy: config.grouping, sleep: async () => {}, now: () => clock }),
    processJobInline:
      options.withModel === false
        ? null
        : (job) => processAfterQuietPeriod({ agent: h.live, grouping }, job, { policy: { quietMs: 0, maxWaitMs: 0 }, sleep: async () => {}, now: () => clock }),
    schedule: (task) => tasks.push(task),
    now: () => clock,
    log: (event, data) => logs.push(JSON.stringify({ event, ...data })),
    ipLimiter: options.ipLimiter,
  });

  const post = async (body: unknown, headers: Record<string, string> = { "x-agent-secret": SECRET }) => {
    const response = await handler(
      new Request("http://localhost/api/agent/inbound", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const drain = async () => {
    const pending = tasks.splice(0);
    await Promise.all(pending.map((task) => task()));
  };
  return { ...h, model, post, drain, tasks, logs, setClock: (date: Date) => (clock = date) };
}

describe("entrada válida (modo sombra)", () => {
  it("mensagem válida: 202, salva cliente/conversa/mensagem e agenda a execução para depois da resposta", async () => {
    const s = setup();
    const response = await s.post(payload());

    assert.equal(response.status, 202);
    assert.deepEqual(response.body, { ok: true, status: "accepted", reply: "-", reply2: "-" });
    assert.equal(s.db.customers.length, 1);
    assert.equal(s.db.customers[0].phone, "+5511987654321");
    assert.equal(s.db.conversations[0].externalId, "mc-123456");
    assert.equal(s.db.messages.length, 1);
    assert.equal(s.model.calls.length, 0); // nada roda antes da resposta
    assert.equal(s.tasks.length, 1);

    await s.drain();
    assert.equal(s.model.calls.length, 1);
    assert.equal(s.runs.runs.length, 1);
    assert.equal(s.runs.runs[0].outcome, "DRAFT_SAVED");
    assert.equal(s.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(networkCalls, 0);
  });

  it("a resposta HTTP nunca contém o texto da IA", async () => {
    const s = setup({ model: replyWith("TEXTO SECRETO DA IA") });
    const response = await s.post(payload());
    await s.drain();
    assert.deepEqual(Object.keys(response.body).sort(), ["ok", "reply", "reply2", "status"]);
    assert.equal((response.body as { reply: string }).reply, "-");
    assert.equal(JSON.stringify(response.body).includes("TEXTO SECRETO"), false);
  });

  it("cliente novo e cliente existente (mesmo telefone em outro formato) viram o mesmo Customer", async () => {
    const s = setup();
    const { customer } = await findOrCreateCustomer(s.db, { unitId: s.unit.id, phone: "11987654321", name: "Maria Silva" });
    await s.post(payload());
    await s.post(payload({ messageId: "wamid.HBgM002", text: "Quero dread" }));
    assert.equal(s.db.customers.length, 1);
    assert.equal(s.db.conversations[0].customerId, customer.id);
    assert.equal(s.db.customers[0].name, "Maria Silva"); // nome do canal não sobrescreve o cadastro
  });

  it("aceita timestamp em segundos (epoch) e o segredo como Bearer", async () => {
    const s = setup();
    const response = await s.post(payload({ timestamp: Math.floor(NOW.getTime() / 1000) }), { authorization: `Bearer ${SECRET}` });
    assert.equal(response.status, 202);
  });

  it("sem messageId nem timestamp (o ManyChat não os oferece): aceita, usa o horário do servidor e deriva o id", async () => {
    const s = setup();
    const response = await s.post(payload({ messageId: undefined, timestamp: undefined }));
    assert.equal(response.status, 202);
    assert.equal(s.db.messages.length, 1);
    assert.match(String(s.db.messages[0].externalId), /^derived:[0-9a-f]{40}$/);
  });

  it("sem chave do modelo: registra a mensagem, mas não agenda execução", async () => {
    const s = setup({ withModel: false });
    const response = await s.post(payload());
    assert.equal(response.status, 202);
    assert.equal(s.db.messages.length, 1);
    assert.equal(s.tasks.length, 0);
  });
});

describe("idempotência e concorrência", () => {
  it("mensagem duplicada: 200 'duplicate', sem novo processamento", async () => {
    const s = setup();
    await s.post(payload());
    await s.drain();
    const again = await s.post(payload());
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, { ok: true, status: "duplicate", reply: "-", reply2: "-" });
    assert.equal(s.tasks.length, 0);
    assert.equal(s.db.messages.length, 1);
    assert.equal(s.runs.runs.length, 1);
  });

  it("4 entregas simultâneas da mesma mensagem: 1 aceita, 3 duplicadas, 1 execução", async () => {
    const s = setup();
    const responses = await Promise.all([1, 2, 3, 4].map(() => s.post(payload())));
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 200, 200, 202]);
    assert.equal(s.db.messages.length, 1);
    assert.equal(s.db.conversations.length, 1);
    assert.equal(s.db.customers.length, 1);
    assert.equal(s.tasks.length, 1);
    await s.drain();
    assert.equal(s.runs.runs.length, 1);
    assert.equal(s.model.calls.length, 1);
  });

  it("tentativa de replay (payload antigo reenviado): recusada por estar fora da janela de tempo", async () => {
    const s = setup();
    const old = await s.post(payload({ messageId: "wamid.ANTIGO", timestamp: new Date(NOW.getTime() - 20 * 60_000).toISOString() }));
    assert.equal(old.status, 400);
    assert.deepEqual(old.body, { ok: false, error: "stale_message" });
    const future = await s.post(payload({ messageId: "wamid.FUTURO", timestamp: new Date(NOW.getTime() + 10 * 60_000).toISOString() }));
    assert.equal(future.status, 400);
    assert.equal(s.db.messages.length, 0);
  });
});

describe("sem id único por mensagem (derivado)", () => {
  const bare = (overrides: Record<string, unknown> = {}) => payload({ messageId: undefined, timestamp: undefined, ...overrides });

  it("mesmo contato, mesmo texto, mesmo minuto (reenvio): 200 'duplicate', 1 mensagem e 1 execução", async () => {
    const s = setup();
    await s.post(bare());
    await s.drain();
    const again = await s.post(bare());
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, { ok: true, status: "duplicate", reply: "-", reply2: "-" });
    assert.equal(s.db.messages.length, 1);
    assert.equal(s.runs.runs.length, 1);
  });

  it("textos diferentes no mesmo minuto: duas mensagens", async () => {
    const s = setup();
    await s.post(bare({ text: "Oi" }));
    await s.post(bare({ text: "Quero fazer microlocs" }));
    assert.equal(s.db.messages.length, 2);
  });

  it("messageId em branco continua inválido (só a ausência é aceita)", async () => {
    const s = setup();
    const response = await s.post(bare({ messageId: "   " }));
    assert.equal(response.status, 400);
    assert.equal(s.db.messages.length, 0);
  });

  it("derivedMessageId: estável no mesmo minuto e diferente no minuto seguinte, no contato ou no texto", () => {
    const t = new Date("2026-10-01T15:30:10-03:00");
    const base = derivedMessageId("mc-1", "oi", t);
    assert.equal(base, derivedMessageId("mc-1", "oi", new Date(t.getTime() + 30_000)));
    assert.notEqual(base, derivedMessageId("mc-1", "oi", new Date(t.getTime() + 60_000)));
    assert.notEqual(base, derivedMessageId("mc-2", "oi", t));
    assert.notEqual(base, derivedMessageId("mc-1", "olá", t));
  });
});

describe("contato de teste (resposta devolvida ao ManyChat)", () => {
  const TEST_IDS = new Set(["mc-123456"]);

  it("contato da lista: roda na hora, devolve o texto aprovado e grava a mensagem da IA", async () => {
    const s = setup({ model: replyWith("Oi! Seu cabelo tem pelo menos 4 dedos de comprimento? 💛"), config: { testReplyContactIds: TEST_IDS } });
    const response = await s.post(payload());

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true, status: "replied", reply: "Oi! Seu cabelo tem pelo menos 4 dedos de comprimento? 💛", reply2: "-" });
    assert.equal(s.tasks.length, 0); // rodou no mesmo pedido, nada agendado
    assert.equal(s.runs.runs.length, 1);
    const outbound = s.db.messages.filter((m) => m.direction === "OUTBOUND");
    assert.equal(outbound.length, 1);
    assert.equal(outbound[0].content, "Oi! Seu cabelo tem pelo menos 4 dedos de comprimento? 💛");
    assert.equal(networkCalls, 0); // este servidor não envia nada para fora
  });

  it("contato que NÃO está na lista nunca recebe o texto", async () => {
    const s = setup({ model: replyWith("TEXTO SECRETO DA IA"), config: { testReplyContactIds: new Set(["outro-contato"]) } });
    const response = await s.post(payload());
    await s.drain();
    assert.deepEqual(Object.keys(response.body).sort(), ["ok", "reply", "reply2", "status"]);
    assert.equal((response.body as { reply: string }).reply, "-");
    assert.equal(JSON.stringify(response.body).includes("TEXTO SECRETO"), false);
    assert.equal(s.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });

  it("rascunho barrado pelas travas (preço): contato de teste recebe resposta vazia", async () => {
    const s = setup({ model: replyWith("Fica R$ 1.000 certinho! 💛"), config: { testReplyContactIds: TEST_IDS } });
    const response = await s.post(payload());
    assert.deepEqual(response.body, { ok: true, status: "no_reply", reply: "-", reply2: "-" });
    assert.equal(s.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });

  it("sem lista configurada (padrão): comportamento de sombra, 202 sem texto", async () => {
    const s = setup({ model: replyWith("TEXTO SECRETO DA IA") });
    const response = await s.post(payload());
    assert.equal(response.status, 202);
    assert.deepEqual(response.body, { ok: true, status: "accepted", reply: "-", reply2: "-" });
  });
});

describe("mídia (o ManyChat só entrega o último texto)", () => {
  const TEST_IDS = new Set(["mc-123456"]);
  const inboundContents = (s: ReturnType<typeof setup>) => s.db.messages.filter((m) => m.direction === "INBOUND").map((m) => m.content);

  it("link de arquivo no lugar do texto vira aviso de mídia", async () => {
    const s = setup({ config: { testReplyContactIds: TEST_IDS } });
    await s.post(payload({ text: "https://manybot-files.s3.amazonaws.com/foto.jpg" }));
    assert.deepEqual(inboundContents(s), [MEDIA_PLACEHOLDER]);
  });

  it("mesmo texto repetido depois de uma resposta vira aviso de mídia (não responde de novo ao texto antigo)", async () => {
    const s = setup({ config: { testReplyContactIds: TEST_IDS } });
    await s.post(payload({ text: "Eu já mandei", messageId: "m-1" }));
    s.setClock(new Date(NOW.getTime() + 3 * 60_000));
    await s.post(payload({ text: "Eu já mandei", messageId: "m-2" }));
    assert.deepEqual(inboundContents(s), ["Eu já mandei", MEDIA_PLACEHOLDER]);
  });

  it("áudio no campo mediaUrl: vira a transcrição e o agente responde a ela", async () => {
    const urls: string[] = [];
    const s = setup({
      model: replyWith("Perfeito, anotei! Seu cabelo tem pelo menos 4 dedos? 💛"),
      config: { testReplyContactIds: TEST_IDS },
      transcribe: async (url) => {
        urls.push(url);
        return { kind: "audio", text: "quero fazer dreads do zero, nunca fiz" };
      },
    });
    const response = await s.post(payload({ text: "{{last_input_text}}", messageId: undefined, mediaUrl: "https://manybot-files.s3.amazonaws.com/a.ogg" }));
    assert.equal(response.body.status, "replied");
    assert.deepEqual(urls, ["https://manybot-files.s3.amazonaws.com/a.ogg"]);
    assert.deepEqual(inboundContents(s), [AUDIO_PREFIX + "quero fazer dreads do zero, nunca fiz"]);
  });

  it("mesma mídia de novo (campo que ficou preenchido) com texto novo: vale o texto, sem transcrever de novo", async () => {
    let calls = 0;
    const s = setup({
      config: { testReplyContactIds: TEST_IDS },
      transcribe: async () => {
        calls += 1;
        return { kind: "audio", text: "oi" };
      },
    });
    const mediaUrl = "https://manybot-files.s3.amazonaws.com/a.ogg";
    await s.post(payload({ text: "{{last_input_text}}", messageId: "m-1", mediaUrl }));
    s.setClock(new Date(NOW.getTime() + 60_000));
    await s.post(payload({ text: "Tenho 10 cm", messageId: "m-2", mediaUrl }));
    assert.equal(calls, 1);
    assert.deepEqual(inboundContents(s), [AUDIO_PREFIX + "oi", "Tenho 10 cm"]);
  });

  it("foto: grava o aviso de foto com o link em metadata (para o modelo ver a imagem)", async () => {
    const s = setup({ withModel: false, transcribe: async () => ({ kind: "image" }) });
    const url = "https://manybot-files.s3.amazonaws.com/ref.jpg";
    await s.post(payload({ text: "{{last_input_text}}", messageId: undefined, mediaUrl: url }));
    const inbound = s.db.messages.filter((m) => m.direction === "INBOUND");
    assert.deepEqual(inbound.map((m) => m.content), [IMAGE_PLACEHOLDER]);
    assert.deepEqual(inbound[0].metadata, { media: "image", imageUrl: url });
  });

  it("foto com link longo demais para guardar: só o aviso de mídia, sem metadata", async () => {
    const s = setup({ withModel: false, transcribe: async () => ({ kind: "image" }) });
    await s.post(payload({ text: "", messageId: undefined, mediaUrl: "https://manybot-files.s3.amazonaws.com/" + "a".repeat(250) + ".jpg" }));
    const inbound = s.db.messages.filter((m) => m.direction === "INBOUND");
    assert.deepEqual(inbound.map((m) => m.content), [MEDIA_PLACEHOLDER]);
    assert.equal(inbound[0].metadata ?? null, null);
  });

  it("link de rede social (não é arquivo do canal) chega como texto, sem tentar baixar", async () => {
    let calls = 0;
    const s = setup({ withModel: false, transcribe: async () => { calls += 1; return { kind: "other" }; } });
    const link = "https://www.instagram.com/reel/abc123/";
    await s.post(payload({ text: link, messageId: undefined }));
    assert.equal(calls, 0);
    assert.deepEqual(inboundContents(s), [link]);
  });

  it("foto ou falha na transcrição: aviso de mídia", async () => {
    const s = setup({ withModel: false, transcribe: async () => ({ kind: "other" }) });
    await s.post(payload({ text: "", messageId: "m-1", mediaUrl: "https://manybot-files.s3.amazonaws.com/f.jpg" }));
    assert.deepEqual(inboundContents(s), [MEDIA_PLACEHOLDER]);
  });

  it("sem texto e sem link (ManyChat sem texto novo): vira aviso de mídia, não erro", async () => {
    const s = setup({ withModel: false });
    const response = await s.post(payload({ text: "{{last_input_text}}", messageId: undefined, mediaUrl: "{{ultima_midia}}" }));
    assert.equal(response.status, 202);
    assert.deepEqual(inboundContents(s), [MEDIA_PLACEHOLDER]);
  });

  it("foto no MESMO minuto do texto anterior (ManyChat repete o texto): vira mídia, não duplicata", async () => {
    const s = setup({ model: replyWith("Recebi, obrigada! 💛"), config: { testReplyContactIds: TEST_IDS } });
    await s.post(payload({ text: "Sim", messageId: undefined }));
    s.setClock(new Date(NOW.getTime() + 20_000));
    const response = await s.post(payload({ text: "Sim", messageId: undefined }));
    assert.notEqual(response.body.status, "duplicate");
    assert.deepEqual(inboundContents(s), ["Sim", MEDIA_PLACEHOLDER]);
  });

  it("resposta da equipe sem texto continua recusada", async () => {
    const s = setup({ withModel: false });
    const response = await s.post(payload({ type: "human_reply", text: "", messageId: undefined }));
    assert.equal(response.status, 400);
  });

  it("texto repetido SEM resposta no meio continua sendo texto", async () => {
    const s = setup({ withModel: false });
    await s.post(payload({ text: "Oi", messageId: "m-1" }));
    s.setClock(new Date(NOW.getTime() + 3 * 60_000));
    await s.post(payload({ text: "Oi", messageId: "m-2" }));
    assert.deepEqual(inboundContents(s), ["Oi", "Oi"]);
  });
});

describe("autenticação e limites", () => {
  it("desligada ou sem segredo configurado: 404 (a rota parece não existir)", async () => {
    assert.equal((await setup({ config: { enabled: false } }).post(payload())).status, 404);
    assert.equal((await setup({ config: { secret: null } }).post(payload())).status, 404);
  });

  it("segredo ausente ou errado: 401, nada gravado, sem detalhes", async () => {
    const s = setup();
    const attempts: Record<string, string>[] = [{}, { "x-agent-secret": "errado" }, { authorization: "Bearer errado" }, { "x-agent-secret": `${SECRET}x` }];
    for (const headers of attempts) {
      const response = await s.post(payload(), headers);
      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { ok: false, error: "unauthorized" });
    }
    assert.equal(s.db.messages.length, 0);
  });

  it("limite por contato (no banco) e por IP (por instância)", async () => {
    const s = setup({ config: { contactLimitPerMinute: 3 } });
    for (let i = 1; i <= 3; i++) assert.equal((await s.post(payload({ messageId: `wamid.${i}` }))).status, 202);
    const blocked = await s.post(payload({ messageId: "wamid.4" }));
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, { ok: false, error: "rate_limited" });

    const ip = setup({ ipLimiter: new FixedWindowLimiter(2, 60_000) });
    await ip.post(payload({ messageId: "a", contactId: "c1" }));
    await ip.post(payload({ messageId: "b", contactId: "c2" }));
    assert.equal((await ip.post(payload({ messageId: "c", contactId: "c3" }))).status, 429);
  });

  it("unidade não configurada: 503 sem detalhes e nada gravado", async () => {
    const s = setup({ noUnit: true });
    const response = await s.post(payload());
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { ok: false, error: "unavailable" });
    assert.equal(s.db.messages.length, 0);
  });
});

describe("validação rigorosa do payload", () => {
  const cases: [string, unknown, number][] = [
    ["JSON inválido", "{oi", 400],
    ["messageId vazio", payload({ messageId: "  " }), 400],
    ["sem contactId", payload({ contactId: undefined }), 400],
    ["sem telefone", payload({ phone: undefined }), 400],
    ["telefone inválido", payload({ phone: "não é telefone" }), 400],
    ["canal errado", payload({ channel: "sms" }), 400],
    ["campo desconhecido", payload({ preco: 400 }), 400],
    ["texto muito grande", payload({ text: "a".repeat(MAX_TEXT_CHARS + 1) }), 400],
    ["timestamp inválido", payload({ timestamp: "ontem" }), 400],
    ["tipo desconhecido", payload({ type: "send_reply" }), 400],
  ];
  for (const [label, body, status] of cases) {
    it(`${label}: ${status} sem detalhes internos`, async () => {
      const s = setup();
      const response = await s.post(body);
      assert.equal(response.status, status);
      assert.equal(response.body.ok, false);
      assert.deepEqual(Object.keys(response.body).sort(), ["error", "ok"]);
      assert.equal(s.db.messages.length, 0);
    });
  }

  it("corpo acima de 16 KB: 413", async () => {
    const s = setup();
    const response = await s.post(payload({ text: "a".repeat(17 * 1024) }));
    assert.equal(response.status, 413);
  });

  it("os logs não contêm texto, telefone nem nome do cliente", async () => {
    const s = setup();
    await s.post(payload(), { "x-agent-secret": "errado" });
    await s.post(payload({ text: "Meu CPF é 123.456.789-00" }));
    await s.drain();
    const logs = s.logs.join("\n");
    for (const leaked of ["98765", "Maria", "CPF", "123.456"]) assert.equal(logs.includes(leaked), false, leaked);
  });
});

describe("estado da conversa", () => {
  it("conversa BOT: executa o agente", async () => {
    const s = setup();
    await s.post(payload());
    await s.drain();
    assert.equal(s.runs.runs.length, 1);
  });

  it("conversa HUMAN: mensagem salva, nada agendado, modelo não chamado, continua HUMAN", async () => {
    const s = setup();
    await s.post(payload());
    await s.drain();
    await handoffToHuman(s.db, { conversationId: s.db.conversations[0].id, reason: "CUSTOMER_REQUEST", summary: { headline: "x" }, actor: STAFF });
    const calls = s.model.calls.length;

    const response = await s.post(payload({ messageId: "wamid.HUMAN", text: "Qual o horário?" }));

    assert.equal(response.status, 202);
    assert.equal(s.tasks.length, 0);
    assert.equal(s.model.calls.length, calls);
    assert.equal(s.runs.runs.length, 1);
    assert.equal(s.db.conversations[0].mode, "HUMAN");
    assert.ok(s.db.messages.some((m) => m.content === "Qual o horário?"));
  });

  it("conversa FINISHED: a nova mensagem reabre (FINISHED → BOT) e o agente roda como pós-atendimento", async () => {
    const s = setup();
    await s.post(payload());
    await s.drain();
    const conversationId = s.db.conversations[0].id;
    await handoffToHuman(s.db, { conversationId, reason: "OTHER", summary: { headline: "x" }, actor: STAFF });
    await finishConversation(s.db, { conversationId, actor: STAFF });

    await s.post(payload({ messageId: "wamid.VOLTEI", text: "Oi, voltei!" }));
    await s.drain();

    assert.equal(s.db.conversations[0].mode, "BOT");
    assert.equal(s.runs.runs.at(-1)?.agentStatus, "finalizado");
  });

  it("a equipe assume DURANTE a execução: rascunho descartado", async () => {
    const holder: { s?: ReturnType<typeof setup> } = {};
    const model = new ScriptedModel(async () => {
      await handoffToHuman(holder.s!.db, { conversationId: holder.s!.db.conversations[0].id, reason: "CUSTOMER_REQUEST", summary: { headline: "x" }, actor: STAFF });
      return { text: "Resposta atrasada", toolCalls: [] };
    });
    holder.s = setup({ model });
    await holder.s.post(payload());
    await holder.s.drain();
    assert.equal(holder.s.runs.runs[0].outcome, "DISCARDED_MODE_CHANGED");
    assert.equal(holder.s.runs.runs[0].candidateText, null);
  });
});

describe("agrupamento de mensagens seguidas", () => {
  it("4 mensagens rápidas: uma única execução, com as 4 no contexto", async () => {
    const s = setup({ config: { grouping: { quietMs: 4000, maxWaitMs: 20000 } } });
    const texts = ["Oi", "Queria colocar dread", "Até a cintura", "Quanto fica?"];
    for (const [i, text] of texts.entries()) {
      s.setClock(new Date(NOW.getTime() + i * 1000));
      await s.post(payload({ messageId: `wamid.G${i}`, text, timestamp: new Date(NOW.getTime() + i * 1000).toISOString() }));
    }
    s.setClock(new Date(NOW.getTime() + 8000));
    assert.equal(s.tasks.length, 4);
    await s.drain();

    assert.equal(s.model.calls.length, 1);
    assert.equal(s.runs.runs.length, 1);
    assert.equal(s.runs.runs[0].groupedMessageCount, 4);
    assert.deepEqual(s.model.calls[0].messages.map((m) => m.content), texts);
  });

  it("nunca segura indefinidamente: passada a espera máxima, processa mesmo com mensagens chegando", async () => {
    const s = setup({ config: { grouping: { quietMs: 4000, maxWaitMs: 5000 } } });
    await s.post(payload({ messageId: "wamid.A", text: "Oi" }));
    s.setClock(new Date(NOW.getTime() + 1000));
    await s.post(payload({ messageId: "wamid.B", text: "Quero dread", timestamp: new Date(NOW.getTime() + 1000).toISOString() }));
    s.setClock(new Date(NOW.getTime() + 6000)); // 6 s depois da primeira (> 5 s)
    await s.drain();
    assert.ok(s.runs.runs.length >= 1);
  });
});

describe("resposta da equipe (human_reply) para comparar com a IA", () => {
  it("registra a resposta da equipe como fato, sem acionar a IA e sem mudar a conversa", async () => {
    const s = setup();
    await s.post(payload());
    await s.drain();
    const response = await s.post(
      payload({ type: "human_reply", messageId: "wamid.EQUIPE1", text: "Oi Maria! Me manda uma foto?", agent: "atendente-1" }),
    );
    assert.equal(response.status, 202);
    assert.deepEqual(response.body, { ok: true, status: "recorded", reply: "-", reply2: "-" });
    const human = s.db.messages.find((m) => m.sender === "HUMAN");
    assert.equal(human?.direction, "OUTBOUND");
    assert.equal(human?.senderRef, "atendente-1");
    assert.equal(s.tasks.length, 0);
    assert.equal(s.db.conversations[0].mode, "BOT");

    const again = await s.post(payload({ type: "human_reply", messageId: "wamid.EQUIPE1", text: "Oi Maria! Me manda uma foto?" }));
    assert.deepEqual(again.body, { ok: true, status: "duplicate", reply: "-", reply2: "-" });
  });

  it("resposta para contato desconhecido é ignorada", async () => {
    const s = setup();
    const response = await s.post(payload({ type: "human_reply", contactId: "nao-existe", text: "oi" }));
    assert.deepEqual(response.body, { ok: true, status: "ignored", reply: "-", reply2: "-" });
    assert.equal(s.db.messages.length, 0);
  });
});

describe("resposta de teste: duas mensagens e silêncio", () => {
  const TEST_IDS = new Set(["mc-123456"]);

  it("[[NOVA_MENSAGEM]] separa a resposta em reply e reply2", async () => {
    const s = setup({
      model: replyWith("Oi! Que bom ter você aqui 💛 Já recebi suas fotos.\n[[NOVA_MENSAGEM]]\nPra iniciar seu atendimento, me fala como você se chama?"),
      config: { testReplyContactIds: TEST_IDS },
    });
    const response = await s.post(payload());
    assert.deepEqual(response.body, {
      ok: true,
      status: "replied",
      reply: "Oi! Que bom ter você aqui 💛 Já recebi suas fotos.",
      reply2: "Pra iniciar seu atendimento, me fala como você se chama?",
    });
    const outbound = s.db.messages.filter((m) => m.direction === "OUTBOUND");
    assert.equal(outbound[0].content.includes("[[NOVA_MENSAGEM]]"), false);
  });

  it("[[SILENCIO]] não devolve texto nem grava mensagem da IA", async () => {
    const s = setup({ model: replyWith("[[SILENCIO]]"), config: { testReplyContactIds: TEST_IDS } });
    const response = await s.post(payload());
    assert.deepEqual(response.body, { ok: true, status: "no_reply", reply: "-", reply2: "-" });
    assert.equal(s.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });
});
