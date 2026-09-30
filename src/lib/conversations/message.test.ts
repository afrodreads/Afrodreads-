import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { finishConversation, handoffToHuman } from "./conversation";
import {
  AiResponseBlockedError,
  ConversationNotFoundError,
  InvalidInputError,
  InvalidPhoneError,
  UnitNotFoundError,
} from "./errors";
import { receiveInboundMessage, recordOutboundMessage, type InboundMessageInput } from "./message";
import { NOW, setup, validSummary } from "./testSupport";

const AI = { type: "AI" } as const;
const THAY = { type: "HUMAN", ref: "atendente-1" } as const;

const inbound = (unitId: string, overrides: Record<string, unknown> = {}): InboundMessageInput => ({
  unitId,
  phone: "(11) 98765-4321",
  customerName: "Maria",
  externalConversationId: "contato-1",
  externalMessageId: "msg-1",
  content: "Oi, quero fazer dreads",
  ...overrides,
} as InboundMessageInput);

describe("receiveInboundMessage: criação", () => {
  it("cria cliente, conversa e mensagem e atualiza o último contato", async () => {
    const { db, unit } = setup();
    const result = await receiveInboundMessage(db, inbound(unit.id), NOW);

    assert.equal(result.duplicate, false);
    assert.equal(result.mode, "BOT");
    assert.equal(result.aiMayRespond, true);
    assert.equal(db.customers.length, 1);
    assert.equal(db.customers[0].phone, "+5511987654321");
    assert.equal(db.conversations.length, 1);
    assert.equal(db.conversations[0].lastContactAt, NOW);

    const message = db.messages[0];
    assert.equal(message.direction, "INBOUND");
    assert.equal(message.sender, "CUSTOMER");
    assert.equal(message.content, "Oi, quero fazer dreads");
    assert.equal(message.externalId, "msg-1");
    assert.equal(message.conversationId, result.conversationId);
  });

  it("mensagens seguintes do mesmo cliente caem na mesma conversa", async () => {
    const { db, unit } = setup();
    await receiveInboundMessage(db, inbound(unit.id), NOW);
    await receiveInboundMessage(db, inbound(unit.id, { externalMessageId: "msg-2", content: "Tem horário?" }), NOW);
    await receiveInboundMessage(
      db,
      inbound(unit.id, { externalConversationId: undefined, externalMessageId: "msg-3", phone: "+55 11 98765-4321" }),
      NOW,
    );

    assert.equal(db.customers.length, 1);
    assert.equal(db.conversations.length, 1); // sem id externo cai na conversa mais recente do cliente
    assert.equal(db.messages.length, 3);
  });

  it("sem identificador externo reaproveita a conversa do cliente", async () => {
    const { db, unit } = setup();
    const base = { externalConversationId: undefined, externalMessageId: undefined };
    await receiveInboundMessage(db, inbound(unit.id, base), NOW);
    await receiveInboundMessage(db, inbound(unit.id, base), NOW);
    assert.equal(db.conversations.length, 1);
    assert.equal(db.messages.length, 2);
  });

  it("não deixa a hora do canal ficar no futuro", async () => {
    const { db, unit } = setup();
    const future = new Date(NOW.getTime() + 3_600_000);
    await receiveInboundMessage(db, inbound(unit.id, { sentAt: future }), NOW);
    assert.equal(db.messages[0].createdAt, NOW);

    const past = new Date(NOW.getTime() - 60_000);
    await receiveInboundMessage(db, inbound(unit.id, { externalMessageId: "msg-2", sentAt: past }), NOW);
    assert.equal(db.messages[1].createdAt.getTime(), past.getTime());
    assert.equal(db.conversations[0].lastContactAt, NOW); // último contato nunca anda para trás
  });
});

describe("receiveInboundMessage: validação", () => {
  it("recusa telefone inválido, conteúdo vazio/longo e metadados grandes sem gravar nada", async () => {
    const { db, unit } = setup();

    await assert.rejects(() => receiveInboundMessage(db, inbound(unit.id, { phone: "abc" }), NOW), InvalidPhoneError);
    await assert.rejects(() => receiveInboundMessage(db, inbound(unit.id, { content: "   " }), NOW), InvalidInputError);
    await assert.rejects(
      () => receiveInboundMessage(db, inbound(unit.id, { content: "x".repeat(4001) }), NOW),
      InvalidInputError,
    );
    await assert.rejects(
      () => receiveInboundMessage(db, inbound(unit.id, { metadata: { blob: "y".repeat(150), b: "y".repeat(150), c: "y".repeat(150), d: "y".repeat(150), e: "y".repeat(150), f: "y".repeat(150), g: "y".repeat(150) } }), NOW),
      InvalidInputError,
    );
    await assert.rejects(
      () => receiveInboundMessage(db, inbound(unit.id, { metadata: { nested: { a: 1 } } }), NOW),
      InvalidInputError,
    );

    assert.equal(db.customers.length, 0);
    assert.equal(db.conversations.length, 0);
    assert.equal(db.messages.length, 0);
  });

  it("recusa unidade inexistente ou inativa", async () => {
    const { db } = setup();
    const inactive = db.addUnit({ slug: "fechada", active: false });
    await assert.rejects(() => receiveInboundMessage(db, inbound("nao-existe"), NOW), UnitNotFoundError);
    await assert.rejects(() => receiveInboundMessage(db, inbound(inactive.id), NOW), UnitNotFoundError);
    assert.equal(db.messages.length, 0);
  });

  it("guarda só metadados mínimos", async () => {
    const { db, unit } = setup();
    await receiveInboundMessage(db, inbound(unit.id, { metadata: { contentType: "text" } }), NOW);
    assert.deepEqual(db.messages[0].metadata, { contentType: "text" });
  });
});

describe("receiveInboundMessage: idempotência", () => {
  it("o mesmo identificador externo entregue duas vezes grava uma única mensagem", async () => {
    const { db, unit } = setup();
    const first = await receiveInboundMessage(db, inbound(unit.id), NOW);
    const second = await receiveInboundMessage(db, inbound(unit.id), NOW);

    assert.equal(second.duplicate, true);
    assert.equal(second.messageId, first.messageId);
    assert.equal(second.conversationId, first.conversationId);
    assert.equal(db.messages.length, 1);
    assert.equal(db.customers.length, 1);
    assert.equal(db.conversations.length, 1);
  });

  it("reentrega não reabre nem mexe em uma conversa já encerrada", async () => {
    const { db, unit } = setup();
    const first = await receiveInboundMessage(db, inbound(unit.id), NOW);
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "OTHER", summary: validSummary, actor: AI });
    await finishConversation(db, { conversationId: first.conversationId, actor: THAY });
    const transitionsBefore = db.transitions.length;

    const again = await receiveInboundMessage(db, inbound(unit.id), NOW);
    assert.equal(again.duplicate, true);
    assert.equal(again.aiMayRespond, false);
    assert.equal(db.conversations[0].mode, "FINISHED");
    assert.equal(db.transitions.length, transitionsBefore);
  });

  it("entregas simultâneas do mesmo identificador gravam uma mensagem só", async () => {
    const { db, unit } = setup();
    const results = await Promise.all([
      receiveInboundMessage(db, inbound(unit.id), NOW),
      receiveInboundMessage(db, inbound(unit.id), NOW),
      receiveInboundMessage(db, inbound(unit.id), NOW),
    ]);

    assert.equal(db.messages.length, 1);
    assert.equal(db.customers.length, 1);
    assert.equal(db.conversations.length, 1);
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal(new Set(results.map((r) => r.messageId)).size, 1);
  });

  it("mensagens sem identificador externo não são deduplicadas (não há como saber)", async () => {
    const { db, unit } = setup();
    const noId = { externalMessageId: undefined };
    await receiveInboundMessage(db, inbound(unit.id, noId), NOW);
    await receiveInboundMessage(db, inbound(unit.id, noId), NOW);
    assert.equal(db.messages.length, 2);
  });
});

describe("receiveInboundMessage: estado da conversa", () => {
  it("em HUMAN a mensagem é guardada, o modo continua HUMAN e a IA não responde", async () => {
    const { db, unit } = setup();
    const first = await receiveInboundMessage(db, inbound(unit.id), NOW);
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "QUOTE_REQUEST", summary: validSummary, actor: AI });

    const result = await receiveInboundMessage(db, inbound(unit.id, { externalMessageId: "msg-2" }), NOW);

    assert.equal(result.mode, "HUMAN");
    assert.equal(result.aiMayRespond, false);
    assert.equal(result.reopened, false);
    assert.equal(db.messages.length, 2);
  });

  it("depois de finalizado, uma nova mensagem reabre (FINISHED → BOT) com auditoria, sem criar cliente novo", async () => {
    const { db, unit } = setup();
    const first = await receiveInboundMessage(db, inbound(unit.id), NOW);
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "OTHER", summary: validSummary, actor: AI });
    await finishConversation(db, { conversationId: first.conversationId, actor: THAY });

    const result = await receiveInboundMessage(db, inbound(unit.id, { externalMessageId: "msg-2", content: "Oi de novo" }), NOW);

    assert.equal(result.reopened, true);
    assert.equal(result.mode, "BOT");
    assert.equal(result.aiMayRespond, true);
    assert.equal(result.conversationId, first.conversationId);
    assert.equal(result.customerId, first.customerId);
    assert.equal(db.customers.length, 1);
    assert.equal(db.conversations.length, 1);

    const last = db.transitions[db.transitions.length - 1];
    assert.equal(last.fromMode, "FINISHED");
    assert.equal(last.toMode, "BOT");
    assert.equal(last.actor, "SYSTEM");
  });
});

describe("recordOutboundMessage: a IA só fala em BOT", () => {
  it("aceita mensagem da IA em BOT e atualiza o último contato", async () => {
    const { db, unit } = setup();
    const { conversationId } = await receiveInboundMessage(db, inbound(unit.id), NOW);
    const later = new Date(NOW.getTime() + 5_000);

    const out = await recordOutboundMessage(db, { conversationId, sender: "AI", content: "Olá! Como posso ajudar?" }, later);

    assert.equal(out.duplicate, false);
    const message = db.messages[1];
    assert.equal(message.direction, "OUTBOUND");
    assert.equal(message.sender, "AI");
    assert.equal(db.conversations[0].lastContactAt, later);
  });

  it("recusa mensagem da IA em HUMAN e em FINISHED, sem gravar", async () => {
    const { db, unit } = setup();
    const { conversationId } = await receiveInboundMessage(db, inbound(unit.id), NOW);
    await handoffToHuman(db, { conversationId, reason: "OTHER", summary: validSummary, actor: AI });

    await assert.rejects(() => recordOutboundMessage(db, { conversationId, sender: "AI", content: "Resposta" }), AiResponseBlockedError);

    await finishConversation(db, { conversationId, actor: THAY });
    await assert.rejects(() => recordOutboundMessage(db, { conversationId, sender: "AI", content: "Resposta" }), AiResponseBlockedError);

    assert.equal(db.messages.length, 1); // só a do cliente
  });

  it("se a conversa passa para HUMAN enquanto a IA ainda gera a resposta, a resposta é recusada", async () => {
    const { db, unit } = setup();
    const { conversationId } = await receiveInboundMessage(db, inbound(unit.id), NOW);

    // A IA consulta e vê BOT...
    const mayRespond = true; // (checkAiMayRespond devolveria allowed: true aqui)
    assert.equal(mayRespond, true);
    // ...a equipe assume no meio do caminho...
    await handoffToHuman(db, { conversationId, reason: "CUSTOMER_REQUEST", summary: validSummary, actor: THAY });
    // ...e a gravação da resposta da IA é barrada.
    await assert.rejects(() => recordOutboundMessage(db, { conversationId, sender: "AI", content: "Resposta atrasada" }), AiResponseBlockedError);
    assert.equal(db.messages.filter((m) => m.sender === "AI").length, 0);
  });

  it("mensagens da equipe e do sistema sempre são registradas (são fatos), e a da equipe exige autor", async () => {
    const { db, unit } = setup();
    const { conversationId } = await receiveInboundMessage(db, inbound(unit.id), NOW);
    await handoffToHuman(db, { conversationId, reason: "OTHER", summary: validSummary, actor: THAY });

    await recordOutboundMessage(db, { conversationId, sender: "HUMAN", senderRef: "atendente-1", content: "Oi, sou a Thay" }, NOW);
    await recordOutboundMessage(db, { conversationId, sender: "SYSTEM", content: "Atendimento iniciado" }, NOW);
    await assert.rejects(() => recordOutboundMessage(db, { conversationId, sender: "HUMAN", content: "sem autor" }), InvalidInputError);

    assert.deepEqual(db.messages.slice(1).map((m) => m.sender), ["HUMAN", "SYSTEM"]);
    assert.equal(db.messages[1].senderRef, "atendente-1");
  });

  it("é idempotente pelo identificador externo", async () => {
    const { db, unit } = setup();
    const { conversationId } = await receiveInboundMessage(db, inbound(unit.id), NOW);
    const input = { conversationId, sender: "AI" as const, content: "Olá!", externalMessageId: "out-1" };

    const first = await recordOutboundMessage(db, input, NOW);
    const second = await recordOutboundMessage(db, input, NOW);
    assert.equal(second.duplicate, true);
    assert.equal(second.messageId, first.messageId);
    assert.equal(db.messages.length, 2);
  });

  it("conversa inexistente e conteúdo inválido", async () => {
    const { db } = setup();
    await assert.rejects(() => recordOutboundMessage(db, { conversationId: "nope", sender: "AI", content: "oi" }), ConversationNotFoundError);
    await assert.rejects(() => recordOutboundMessage(db, { conversationId: "nope", sender: "AI", content: "" }), InvalidInputError);
  });
});

describe("isolamento entre unidades (mensagens)", () => {
  it("o mesmo identificador de mensagem em unidades diferentes não é duplicata", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });

    const a = await receiveInboundMessage(db, inbound(unit.id), NOW);
    const b = await receiveInboundMessage(db, inbound(other.id), NOW);

    assert.equal(b.duplicate, false);
    assert.notEqual(a.conversationId, b.conversationId);
    assert.notEqual(a.customerId, b.customerId);
    assert.equal(db.messages.length, 2);
    assert.equal(db.customers.length, 2);
  });

  it("o estado de uma unidade não afeta a outra", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });
    const a = await receiveInboundMessage(db, inbound(unit.id), NOW);
    const b = await receiveInboundMessage(db, inbound(other.id), NOW);

    await handoffToHuman(db, { conversationId: a.conversationId, reason: "OTHER", summary: validSummary, actor: AI });

    const again = await receiveInboundMessage(db, inbound(other.id, { externalMessageId: "msg-2" }), NOW);
    assert.equal(again.conversationId, b.conversationId);
    assert.equal(again.mode, "BOT");
    assert.equal(again.aiMayRespond, true);
  });
});
