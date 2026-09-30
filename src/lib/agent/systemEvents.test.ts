import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryConversations } from "../conversations/memoryRepo";
import { finishConversation, handoffToHuman } from "../conversations/conversation";
import { AiResponseBlockedError } from "../conversations/errors";
import { receiveInboundMessage, recordOutboundMessage } from "../conversations/message";
import { NotShadowModeError } from "./config";
import {
  planSystemEvent,
  runSystemEventShadow,
  ShadowSystemDispatcher,
  type SystemEvent,
  type TrustedEventData,
} from "./systemEvents";
import {
  MemoryShadowSystemSink,
  MemorySystemEventReader,
  noLocationSettings,
  SECRET_ADDRESS,
  SECRET_MAP,
  secureSettings,
  unitConfig,
} from "./testSupport";

const paymentEvent: SystemEvent = { type: "PAYMENT_CONFIRMED", eventId: "ev-pay-1", bookingId: "b1" };
const finishedEvent: SystemEvent = { type: "SERVICE_FINISHED", eventId: "ev-fin-1", conversationId: "c1" };

const trusted = (overrides: Partial<TrustedEventData> = {}): TrustedEventData => ({
  unitId: "u1",
  conversationId: "c1",
  conversationMode: "HUMAN",
  customerName: "Maria",
  bookingStatus: "CONFIRMED",
  appointmentType: "aplicacao_do_zero",
  unit: unitConfig("u1"),
  ...overrides,
});

describe("evento SYSTEM: pagamento confirmado", () => {
  it("aplicação: confirmação + card de cuidados + localização, com template fixo", async () => {
    const plan = await planSystemEvent(paymentEvent, trusted(), { secure: secureSettings });

    assert.equal(plan.skippedReason, null);
    assert.deepEqual(plan.items.map((i) => i.kind === "card" ? `card:${i.cardId}` : i.kind), ["text", "card:cuidados-antes-dos-dreads", "location"]);
    const text = plan.items[0];
    assert.ok(text.kind === "text");
    assert.equal(text.text, "Seu horário está confirmado, Maria! 💛 Aqui estão os cuidados para você vir com o cabelo prontinho para a aplicação.");
    const location = plan.items[2];
    assert.ok(location.kind === "location");
    assert.ok(location.text.includes(SECRET_ADDRESS) && location.text.includes(SECRET_MAP));
    assert.deepEqual(plan.missing, []);
  });

  it("manutenção usa o card e o texto de manutenção", async () => {
    const plan = await planSystemEvent(paymentEvent, trusted({ appointmentType: "manutencao" }), { secure: secureSettings });
    assert.deepEqual(plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["text", "cuidados-antes-da-manutencao", "location"]);
    assert.ok(plan.items[0].kind === "text" && /manutenção está confirmada/.test(plan.items[0].text));
  });

  it("sem nome cadastrado não inventa nome", async () => {
    const plan = await planSystemEvent(paymentEvent, trusted({ customerName: null }), { secure: secureSettings });
    assert.ok(plan.items[0].kind === "text");
    assert.doesNotMatch(plan.items[0].text, /undefined|null|\{nome\}/);
    assert.match(plan.items[0].text, /^Seu horário está confirmado! 💛/);
  });

  it("só confirma se o BANCO diz que o agendamento está confirmado", async () => {
    for (const status of ["PENDING_PAYMENT", "EXPIRED", "CANCELLED", null]) {
      const plan = await planSystemEvent(paymentEvent, trusted({ bookingStatus: status }), { secure: secureSettings });
      assert.equal(plan.items.length, 0, String(status));
      assert.equal(plan.skippedReason, "booking_not_confirmed");
    }
  });

  it("localização ausente no cofre da unidade: omite e avisa, nunca inventa", async () => {
    const plan = await planSystemEvent(paymentEvent, trusted(), { secure: noLocationSettings });
    assert.ok(plan.items.every((i) => i.kind !== "location"));
    assert.deepEqual(plan.missing, ["location"]);
    assert.ok(plan.items.some((i) => i.kind === "card"));
  });

  it("tipo de atendimento desconhecido: não escolhe card, a equipe decide", async () => {
    const plan = await planSystemEvent(paymentEvent, trusted({ appointmentType: null }), { secure: secureSettings });
    assert.equal(plan.items.length, 0);
    assert.equal(plan.skippedReason, "appointment_type_unknown");
    assert.deepEqual(plan.missing, ["appointment_type"]);
  });

  it("sem conversa ou sem dados confiáveis, não envia nada", async () => {
    assert.equal((await planSystemEvent(paymentEvent, trusted({ conversationId: null }), { secure: secureSettings })).skippedReason, "no_conversation");
    assert.equal((await planSystemEvent(paymentEvent, null, { secure: secureSettings })).skippedReason, "trusted_data_unavailable");
  });
});

describe("evento SYSTEM: atendimento finalizado pela equipe", () => {
  it("aplicação do zero: cuidados + manutenção + agradecimento com link de avaliação da unidade", async () => {
    const plan = await planSystemEvent(finishedEvent, trusted({ conversationMode: "FINISHED" }), { secure: secureSettings });
    assert.deepEqual(
      plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)),
      ["cuidados-depois-dos-dreads", "manutencao", "text"],
    );
    const text = plan.items[2];
    assert.ok(text.kind === "text");
    assert.match(text.text, /Ficamos muito felizes por ter você com a gente, Maria!/);
    assert.ok(text.text.includes("https://reviews.example.test/avaliar"));
  });

  it("manutenção: sem o card de manutenção", async () => {
    const plan = await planSystemEvent(finishedEvent, trusted({ conversationMode: "FINISHED", appointmentType: "manutencao" }), { secure: secureSettings });
    assert.deepEqual(plan.items.map((i) => (i.kind === "card" ? i.cardId : i.kind)), ["cuidados-depois-dos-dreads", "text"]);
  });

  it("sem link de avaliação cadastrado: omite a frase do link e avisa", async () => {
    const plan = await planSystemEvent(
      finishedEvent,
      trusted({ conversationMode: "FINISHED", unit: unitConfig("u1", { reviewUrl: null }) }),
      { secure: secureSettings },
    );
    const text = plan.items.find((i) => i.kind === "text");
    assert.ok(text && text.kind === "text");
    assert.doesNotMatch(text.text, /avaliação|http/);
    assert.deepEqual(plan.missing, ["review_url"]);
  });

  it("só sai se a conversa está mesmo FINISHED", async () => {
    for (const mode of ["HUMAN", "BOT", null] as const) {
      const plan = await planSystemEvent(finishedEvent, trusted({ conversationMode: mode }), { secure: secureSettings });
      assert.equal(plan.items.length, 0);
      assert.equal(plan.skippedReason, "conversation_not_finished");
    }
  });
});

describe("SYSTEM é separado de AI (modo sombra)", () => {
  async function ctx(mode: "HUMAN" | "FINISHED") {
    const db = new MemoryConversations();
    const unit = db.addUnit({ slug: "principal" });
    const first = await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m1", content: "oi" });
    await handoffToHuman(db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" } });
    if (mode === "FINISHED") await finishConversation(db, { conversationId: first.conversationId, actor: { type: "HUMAN", ref: "a" } });
    const sink = new MemoryShadowSystemSink();
    const reader = new MemorySystemEventReader(
      trusted({ conversationId: first.conversationId, unitId: unit.id, conversationMode: mode }),
    );
    return { db, conversationId: first.conversationId, sink, reader };
  }

  it("o evento NÃO muda a conversa: HUMAN continua HUMAN e FINISHED continua FINISHED", async () => {
    for (const mode of ["HUMAN", "FINISHED"] as const) {
      const { db, conversationId, sink, reader } = await ctx(mode);
      const before = db.transitions.length;
      const event: SystemEvent = mode === "HUMAN"
        ? { type: "PAYMENT_CONFIRMED", eventId: `e-${mode}`, bookingId: "b1" }
        : { type: "SERVICE_FINISHED", eventId: `e-${mode}`, conversationId };

      await runSystemEventShadow(
        { config: { mode: "shadow" }, reader, secure: secureSettings, dispatcher: new ShadowSystemDispatcher(sink) },
        event,
      );

      assert.equal(db.conversations[0].mode, mode);
      assert.equal(db.transitions.length, before);
      assert.equal(db.messages.filter((m) => m.direction === "OUTBOUND").length, 0); // nada gravado como enviado
    }
  });

  it("a IA continua bloqueada em HUMAN enquanto o SYSTEM é aceito (remetentes distintos)", async () => {
    const { db, conversationId } = await ctx("HUMAN");
    await assert.rejects(
      () => recordOutboundMessage(db, { conversationId, sender: "AI", content: "Seu pagamento foi confirmado!" }),
      AiResponseBlockedError,
    );
    const system = await recordOutboundMessage(db, { conversationId, sender: "SYSTEM", content: "Confirmação oficial" });
    assert.equal(system.duplicate, false);
    assert.equal(db.conversations[0].mode, "HUMAN");
  });

  it("o despachante de sombra é idempotente por evento e não guarda endereço nem mapa", async () => {
    const { sink, reader } = await ctx("HUMAN");
    const deps = { config: { mode: "shadow" }, reader, secure: secureSettings, dispatcher: new ShadowSystemDispatcher(sink) };
    const event: SystemEvent = { type: "PAYMENT_CONFIRMED", eventId: "ev-1", bookingId: "b1" };

    const first = await runSystemEventShadow(deps, event);
    const second = await runSystemEventShadow(deps, event);

    assert.equal(first.outcome, "recorded");
    assert.equal(second.outcome, "duplicate");
    assert.equal(sink.plans.length, 1);
    const stored = JSON.stringify(sink.plans[0]);
    assert.equal(stored.includes(SECRET_ADDRESS), false);
    assert.equal(stored.includes(SECRET_MAP), false);
  });

  it("recusa qualquer modo que não seja sombra", async () => {
    const { sink, reader } = await ctx("HUMAN");
    await assert.rejects(
      () =>
        runSystemEventShadow(
          { config: { mode: "live" }, reader, secure: secureSettings, dispatcher: new ShadowSystemDispatcher(sink) },
          paymentEvent,
        ),
      NotShadowModeError,
    );
    assert.equal(sink.plans.length, 0);
  });

  it("plano vazio é registrado como 'empty', nunca como envio", async () => {
    const { sink, reader } = await ctx("HUMAN");
    reader.data = trusted({ bookingStatus: "PENDING_PAYMENT", conversationId: "c1" });
    const result = await runSystemEventShadow(
      { config: { mode: "shadow" }, reader, secure: secureSettings, dispatcher: new ShadowSystemDispatcher(sink) },
      { type: "PAYMENT_CONFIRMED", eventId: "ev-2", bookingId: "b1" },
    );
    assert.equal(result.outcome, "empty");
  });
});
