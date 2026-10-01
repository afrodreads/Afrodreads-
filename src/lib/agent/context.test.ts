import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryConversations } from "../conversations/memoryRepo";
import { finishConversation, handoffToHuman, claimHandoff } from "../conversations/conversation";
import { receiveInboundMessage, recordOutboundMessage } from "../conversations/message";
import { buildAgentContext, CONTEXT_MESSAGE_LIMIT, contextSnapshot, formatSaoPaulo, renderContextBlock } from "./context";
import { MemoryContextReader, promotion, SECRET_ADDRESS, SECRET_MAP } from "./testSupport";

const NOW = new Date("2026-10-01T15:30:00-03:00");

async function setup() {
  const db = new MemoryConversations();
  const unit = db.addUnit({ slug: "principal" });
  const reader = new MemoryContextReader(db);
  const first = await receiveInboundMessage(
    db,
    { unitId: unit.id, phone: "11987654321", customerName: "Maria", externalMessageId: "m1", content: "Oi" },
    NOW,
  );
  return { db, unit, reader, conversationId: first.conversationId, firstMessageId: first.messageId };
}

describe("contexto do agente", () => {
  it("entrega status, hora de São Paulo, nome e unidade como dados estruturados", async () => {
    const { reader, conversationId } = await setup();
    const context = buildAgentContext((await reader.load(conversationId))!, NOW);

    assert.equal(context.status, "novo");
    assert.equal(context.customerName, "Maria");
    assert.equal(context.nowSaoPaulo, "01/10/2026 15:30 (quinta, horário de São Paulo)");
    assert.equal(context.unit.displayName, "Unidade Teste");
    assert.equal(context.messages.length, 1);
    assert.equal(context.messages[0].role, "user");
  });

  it("formata data e hora no fuso de SP mesmo vindo de UTC", () => {
    assert.equal(formatSaoPaulo(new Date("2026-10-01T02:00:00Z")), "30/09/2026 23:00 (quarta, horário de São Paulo)");
  });

  it("só inclui promoções ATIVAS da unidade; vencida ou de outra unidade vira desconhecida", async () => {
    const { reader, unit, conversationId } = await setup();
    reader.promotions = [promotion(unit.id), promotion("outra-unidade", { id: "promo-outra", priceBrl: 999 })];

    const active = buildAgentContext((await reader.load(conversationId))!, NOW);
    assert.deepEqual(active.promotions.map((p) => p.id), ["promo-teste"]);
    assert.match(renderContextBlock(active), /R\$ 750/);
    assert.doesNotMatch(renderContextBlock(active), /999/);

    const expired = buildAgentContext((await reader.load(conversationId))!, new Date("2026-11-02T10:00:00-03:00"));
    assert.equal(expired.promotions.length, 0);
    assert.doesNotMatch(renderContextBlock(expired), /R\$ 750/);
    assert.ok(expired.unknowns.some((item) => /promo/i.test(item)));
  });

  it("declara como DESCONHECIDOS: preço, agenda, endereço e status de pagamento", async () => {
    const { reader, conversationId } = await setup();
    const all = buildAgentContext((await reader.load(conversationId))!, NOW).unknowns.join(" | ").toLowerCase();
    for (const topic of ["preço", "disponibilidade", "endereço", "pagamento"]) assert.match(all, new RegExp(topic));
  });

  it("nunca carrega endereço nem mapa", async () => {
    const { reader, conversationId } = await setup();
    const context = buildAgentContext((await reader.load(conversationId))!, NOW);
    const serialized = JSON.stringify(context) + renderContextBlock(context);
    assert.equal(serialized.includes(SECRET_ADDRESS), false);
    assert.equal(serialized.includes(SECRET_MAP), false);
  });

  it("o snapshot guarda ids das mensagens, não o texto", async () => {
    const { reader, conversationId, firstMessageId } = await setup();
    const snapshot = contextSnapshot(buildAgentContext((await reader.load(conversationId))!, NOW));
    assert.deepEqual(snapshot.messageIds, [firstMessageId]);
    assert.equal(JSON.stringify(snapshot).includes("Oi"), false);
  });

  it("status acompanha o ciclo da conversa (HUMAN → FINISHED → cliente volta)", async () => {
    const { db, unit, reader, conversationId } = await setup();
    await recordOutboundMessage(db, { conversationId, sender: "AI", content: "Olá!" }, NOW);
    assert.equal(buildAgentContext((await reader.load(conversationId))!, NOW).status, "em_atendimento");

    await handoffToHuman(db, { conversationId, reason: "QUOTE_REQUEST", summary: { headline: "Orçamento" }, actor: { type: "AI" } });
    assert.equal(buildAgentContext((await reader.load(conversationId))!, NOW).status, "aguardando_humano");

    await claimHandoff(db, { conversationId, by: "atendente-1" });
    assert.equal(buildAgentContext((await reader.load(conversationId))!, NOW).status, "humano_atendendo");

    await finishConversation(db, { conversationId, actor: { type: "HUMAN", ref: "atendente-1" } });
    assert.equal(buildAgentContext((await reader.load(conversationId))!, NOW).status, "finalizado");

    await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m2", content: "voltei" }, NOW);
    const back = buildAgentContext((await reader.load(conversationId))!, NOW);
    assert.equal(back.mode, "BOT");
    assert.equal(back.status, "finalizado");
  });

  it("lido 'até' uma mensagem: ignora o que veio depois e reconstrói o modo daquele momento", async () => {
    const { db, unit, reader, conversationId, firstMessageId } = await setup();
    const later = new Date(NOW.getTime() + 60_000);
    await handoffToHuman(db, { conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" }, now: later });
    await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m2", content: "depois" }, later);

    const past = (await reader.load(conversationId, { upToMessageId: firstMessageId }))!;
    assert.equal(past.recentMessages.length, 1);
    assert.equal(past.modeAtTrigger, "BOT");
    assert.equal(past.conversation.mode, "HUMAN"); // o atual continua disponível
    assert.equal(buildAgentContext(past, NOW, { useModeAtTrigger: true }).mode, "BOT");
  });

  it("agendamento confirmado vem do backend e o agente é avisado de que não confirma nada", async () => {
    const { reader, conversationId } = await setup();
    reader.upcomingConfirmedBooking = { startsAt: new Date("2026-10-07T10:00:00-03:00"), serviceName: "Retwist" };
    const context = buildAgentContext((await reader.load(conversationId))!, NOW);
    assert.equal(context.status, "agendamento_confirmado");
    assert.match(renderContextBlock(context), /NÃO confirma nem altera agendamentos/);
  });

  it("limita e trunca o histórico", async () => {
    const { db, unit, reader, conversationId } = await setup();
    for (let i = 0; i < 30; i++) {
      await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: `x${i}`, content: "a".repeat(800) }, NOW);
    }
    const context = buildAgentContext((await reader.load(conversationId))!, NOW);
    assert.equal(context.messages.length, CONTEXT_MESSAGE_LIMIT);
    assert.ok(context.messages.every((m) => m.text.length <= 601));
  });
});
