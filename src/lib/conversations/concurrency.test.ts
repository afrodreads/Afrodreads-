import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findOrCreateConversation } from "./conversation";
import { findOrCreateCustomer } from "./customer";
import { receiveInboundMessage } from "./message";
import { setup } from "./testSupport";

// Regressão (achada no teste de integração da Fase 3 com Postgres real): sem id
// de conversa do canal, entregas simultâneas da PRIMEIRA mensagem de um cliente
// novo criavam duas conversas e duplicavam a mensagem.

describe("concorrência sem id de conversa do canal", () => {
  it("criações simultâneas para o mesmo cliente geram UMA conversa", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const results = await Promise.all([1, 2, 3].map(() => findOrCreateConversation(db, { unitId: unit.id, customer })));
    assert.equal(db.conversations.length, 1);
    assert.equal(new Set(results.map((r) => r.conversation.id)).size, 1);
    assert.equal(results.filter((r) => r.created).length, 1);
  });

  it("entregas simultâneas da primeira mensagem de um cliente novo: 1 cliente, 1 conversa, 1 mensagem", async () => {
    const { db, unit } = setup();
    const input = { unitId: unit.id, phone: "(11) 98765-4321", externalMessageId: "wamid-1", content: "Oi" };
    const results = await Promise.all([1, 2, 3, 4].map(() => receiveInboundMessage(db, input)));
    assert.equal(db.customers.length, 1);
    assert.equal(db.conversations.length, 1);
    assert.equal(db.messages.length, 1);
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
  });

  it("a chave própria não interfere na regra de reaproveitar a conversa mais recente", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const withChannelId = await findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "contato-1" });
    const withoutId = await findOrCreateConversation(db, { unitId: unit.id, customer });
    assert.equal(withoutId.conversation.id, withChannelId.conversation.id);
    assert.equal(db.conversations.length, 1);
  });
});
