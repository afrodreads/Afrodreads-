import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handoffToHuman } from "../conversations/conversation";
import { AiResponseBlockedError } from "../conversations/errors";
import { MemoryConversations } from "../conversations/memoryRepo";
import { receiveInboundMessage, recordOutboundMessage } from "../conversations/message";
import { NotShadowModeError } from "./config";
import { finishConversationWithEvent } from "./pipeline";
import {
  paymentConfirmedEvent,
  planSystemEvent,
  processSystemEvent,
  serviceFinishedEvent,
  ShadowSystemDispatcher,
  SYSTEM_EVENT_MAX_ATTEMPTS,
  type SystemEventDataReader,
  type TrustedEventData,
} from "./systemEvents";
import {
  MemorySystemEventReader,
  MemorySystemEventStore,
  noLocationSettings,
  SECRET_ADDRESS,
  SECRET_MAP,
  secureSettings,
  unitConfig,
} from "./testSupport";

const NOW = new Date("2026-10-01T15:30:00-03:00");

const trusted = (overrides: Partial<TrustedEventData> = {}): TrustedEventData => ({
  unitId: "u1",
  conversationId: "c1",
  conversationMode: "HUMAN",
  customerName: "Maria",
  bookingStatus: "CONFIRMED",
  appointmentType: "FIRST_APPLICATION",
  unit: unitConfig("u1"),
  ...overrides,
});

const payEvent = { id: "ev-1", type: "PAYMENT_CONFIRMED" as const };
const finEvent = { id: "ev-2", type: "SERVICE_FINISHED" as const };

function processor(reader: SystemEventDataReader, events = new MemorySystemEventStore()) {
  return {
    events,
    deps: { config: { mode: "shadow" }, events, reader, secure: secureSettings, dispatcher: new ShadowSystemDispatcher() },
  };
}

describe("SystemEvent: fila persistente e idempotente", () => {
  it("o mesmo evento enfileirado várias vezes (inclusive em paralelo) vira UMA linha", async () => {
    const store = new MemorySystemEventStore();
    const event = paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" });
    const results = await Promise.all([1, 2, 3].map(() => store.enqueue(event, NOW)));
    assert.equal(store.events.length, 1);
    assert.equal(results.filter((r) => r.created).length, 1);
    assert.equal(new Set(results.map((r) => r.id)).size, 1);

    // Confirmação pelo Mercado Pago do MESMO agendamento não gera segundo evento.
    await store.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MERCADO_PAGO" }), NOW);
    assert.equal(store.events.length, 1);
  });

  it("guarda tipo, entidade, payload estruturado, status, tentativas e datas", async () => {
    const store = new MemorySystemEventStore();
    const { id } = await store.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);
    const stored = (await store.find(id))!;
    assert.equal(stored.type, "PAYMENT_CONFIRMED");
    assert.equal(stored.entityType, "BOOKING");
    assert.equal(stored.entityId, "b1");
    assert.deepEqual(stored.payload, { bookingId: "b1", source: "MANUAL" });
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.attempts, 0);
    assert.equal(stored.idempotencyKey, "payment-confirmed:b1");
    assert.equal(stored.processedAt, null);
  });

  it("processamento: um evento gera UMA ação, mesmo com processadores simultâneos", async () => {
    const reader = new MemorySystemEventReader(trusted());
    const { events, deps } = processor(reader);
    const { id } = await events.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);

    const results = await Promise.all([1, 2, 3].map(() => processSystemEvent(deps, id, NOW)));

    assert.equal(results.filter((r) => r.status === "PROCESSED").length, 1);
    assert.equal(results.filter((r) => r.status === "not_claimed").length, 2);
    assert.equal(reader.loads, 1);
    const stored = (await events.find(id))!;
    assert.equal(stored.status, "PROCESSED");
    assert.equal(stored.attempts, 1);
    assert.deepEqual(stored.processedAt, NOW);
    // processar de novo depois de concluído não faz nada
    assert.deepEqual(await processSystemEvent(deps, id, NOW), { status: "not_claimed" });
  });

  it("o plano guardado não tem endereço nem mapa", async () => {
    const { events, deps } = processor(new MemorySystemEventReader(trusted()));
    const { id } = await events.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);
    await processSystemEvent(deps, id, NOW);
    const stored = JSON.stringify(await events.find(id));
    assert.equal(stored.includes(SECRET_ADDRESS), false);
    assert.equal(stored.includes(SECRET_MAP), false);
  });

  it("falha registra o erro e permite nova tentativa até o limite", async () => {
    const reader: SystemEventDataReader = { load: async () => { throw new Error("banco fora do ar"); } };
    const { events, deps } = processor(reader);
    const { id } = await events.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);

    for (let i = 1; i <= SYSTEM_EVENT_MAX_ATTEMPTS; i++) {
      const result = await processSystemEvent(deps, id, NOW);
      assert.equal(result.status, "FAILED");
    }
    const stored = (await events.find(id))!;
    assert.equal(stored.attempts, SYSTEM_EVENT_MAX_ATTEMPTS);
    assert.match(stored.lastError ?? "", /banco fora do ar/);
    assert.deepEqual(await processSystemEvent(deps, id, NOW), { status: "not_claimed" }); // esgotou
  });

  it("processamento travado (queda) pode ser retomado só depois da reserva vencer", async () => {
    const { events, deps } = processor(new MemorySystemEventReader(trusted()));
    const { id } = await events.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);
    await events.claim(id, NOW, { maxAttempts: 5, leaseMs: 600_000 }); // "travou" em PROCESSING

    assert.deepEqual(await processSystemEvent(deps, id, new Date(NOW.getTime() + 60_000)), { status: "not_claimed" });
    const retried = await processSystemEvent(deps, id, new Date(NOW.getTime() + 11 * 60_000));
    assert.equal(retried.status, "PROCESSED");
  });

  it("recusa qualquer modo que não seja sombra", async () => {
    const { events, deps } = processor(new MemorySystemEventReader(trusted()));
    const { id } = await events.enqueue(paymentConfirmedEvent({ bookingId: "b1", unitId: "u1", source: "MANUAL" }), NOW);
    await assert.rejects(() => processSystemEvent({ ...deps, config: { mode: "live" } }, id, NOW), NotShadowModeError);
    assert.equal((await events.find(id))!.status, "PENDING");
  });
});

describe("SYSTEM usa templates e dados confiáveis (não interpreta, não inventa)", () => {
  it("pagamento confirmado, primeira aplicação: confirmação + card + localização com estacionamento da unidade", async () => {
    const plan = await planSystemEvent(payEvent, trusted(), { secure: secureSettings });
    assert.deepEqual(plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["text", "cuidados-antes-dos-dreads", "location"]);
    assert.ok(plan.items[0].kind === "text");
    assert.equal(plan.items[0].text, "Seu horário está confirmado, Maria! 💛 Aqui estão os cuidados para você vir com o cabelo prontinho para a aplicação.");
    const location = plan.items[2];
    assert.ok(location.kind === "location");
    assert.equal(location.text, `Nosso endereço: ${SECRET_ADDRESS}. Temos estacionamento no local. Localização no mapa: ${SECRET_MAP}`);
  });

  it("manutenção usa card e texto de manutenção; sem estacionamento cadastrado, não menciona", async () => {
    const plan = await planSystemEvent(
      payEvent,
      trusted({ appointmentType: "MAINTENANCE", unit: unitConfig("u1", { parkingInfo: null }) }),
      { secure: secureSettings },
    );
    assert.deepEqual(plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["text", "cuidados-antes-da-manutencao", "location"]);
    const location = plan.items[2];
    assert.ok(location.kind === "location" && !/estacionamento/.test(location.text));
  });

  it("appointmentType desconhecido (nulo): não escolhe card, aponta o dado que falta", async () => {
    const plan = await planSystemEvent(payEvent, trusted({ appointmentType: null }), { secure: secureSettings });
    assert.equal(plan.items.length, 0);
    assert.equal(plan.skippedReason, "appointment_type_unknown");
    assert.deepEqual(plan.missing, ["appointment_type"]);
  });

  it("só confirma se o BANCO diz CONFIRMED; sem conversa ou sem dados, não envia nada", async () => {
    for (const status of ["PENDING_PAYMENT", "EXPIRED", "CANCELLED", null]) {
      assert.equal((await planSystemEvent(payEvent, trusted({ bookingStatus: status }), { secure: secureSettings })).skippedReason, "booking_not_confirmed");
    }
    assert.equal((await planSystemEvent(payEvent, trusted({ conversationId: null }), { secure: secureSettings })).skippedReason, "no_conversation");
    assert.equal((await planSystemEvent(payEvent, null, { secure: secureSettings })).skippedReason, "trusted_data_unavailable");
  });

  it("sem localização no cadastro da unidade: omite e avisa", async () => {
    const plan = await planSystemEvent(payEvent, trusted(), { secure: noLocationSettings });
    assert.ok(plan.items.every((i) => i.kind !== "location"));
    assert.deepEqual(plan.missing, ["location"]);
  });

  it("atendimento finalizado: cuidados + manutenção (1ª aplicação) + agradecimento com avaliação da unidade", async () => {
    const plan = await planSystemEvent(finEvent, trusted({ conversationMode: "FINISHED" }), { secure: secureSettings });
    assert.deepEqual(plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["cuidados-depois-dos-dreads", "manutencao", "text"]);
    const text = plan.items[2];
    assert.ok(text.kind === "text");
    assert.match(text.text, /Ficamos muito felizes por ter você com a gente, Maria!/);
    assert.match(text.text, /avaliação no Google/);
    assert.ok(text.text.includes("https://reviews.example.test/avaliar"));
  });

  it("finalização só sai com a conversa realmente FINISHED; manutenção não leva o card de manutenção", async () => {
    for (const mode of ["HUMAN", "BOT", null] as const) {
      assert.equal((await planSystemEvent(finEvent, trusted({ conversationMode: mode }), { secure: secureSettings })).skippedReason, "conversation_not_finished");
    }
    const maintenance = await planSystemEvent(finEvent, trusted({ conversationMode: "FINISHED", appointmentType: "MAINTENANCE" }), { secure: secureSettings });
    assert.deepEqual(maintenance.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["cuidados-depois-dos-dreads", "text"]);
  });
});

describe("SYSTEM não é IA", () => {
  it("finalizar gera UM evento SERVICE_FINISHED e a conversa fica FINISHED (não volta para BOT)", async () => {
    const db = new MemoryConversations();
    const unit = db.addUnit({ slug: "principal" });
    const events = new MemorySystemEventStore();
    const first = await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m1", content: "oi" }, NOW);
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" } });

    const done = await finishConversationWithEvent(
      { conversations: db, events },
      { conversationId: first.conversationId, actor: { type: "HUMAN", ref: "atendente-1" }, now: NOW },
    );

    assert.equal(done.conversation.mode, "FINISHED");
    assert.equal(events.events.length, 1);
    assert.equal(events.events[0].type, "SERVICE_FINISHED");
    assert.equal(events.events[0].entityType, "CONVERSATION");
    assert.equal(events.events[0].idempotencyKey, serviceFinishedEvent({ conversationId: first.conversationId, unitId: unit.id, finishedAt: NOW }).idempotencyKey);

    const { deps } = processor(new MemorySystemEventReader(trusted({ conversationId: first.conversationId, conversationMode: "FINISHED" })), events);
    await processSystemEvent(deps, events.events[0].id, NOW);
    assert.equal(db.conversations[0].mode, "FINISHED");
    assert.equal(db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });

  it("na conversa em HUMAN a IA é recusada e o SYSTEM é aceito (remetentes distintos)", async () => {
    const db = new MemoryConversations();
    const unit = db.addUnit({ slug: "principal" });
    const first = await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m1", content: "oi" });
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" } });

    await assert.rejects(
      () => recordOutboundMessage(db, { conversationId: first.conversationId, sender: "AI", content: "Seu pagamento foi confirmado!" }),
      AiResponseBlockedError,
    );
    const system = await recordOutboundMessage(db, { conversationId: first.conversationId, sender: "SYSTEM", content: "Confirmação oficial" });
    assert.equal(system.duplicate, false);
    assert.equal(db.conversations[0].mode, "HUMAN");
  });
});
