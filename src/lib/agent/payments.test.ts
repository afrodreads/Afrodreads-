import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InvalidInputError } from "../conversations/errors";
import { assertStaff, NotAuthorizedError, type StaffActor } from "./actors";
import { confirmManualPayment, paymentConfirmedEvent, type ConfirmManualPaymentInput } from "./manualPayment";
import {
  effectivePaymentDeadline,
  extendPaymentDeadline,
  isPaymentWindowOpenWithHold,
  MAX_EXTENSION_HOURS,
} from "./paymentHold";
import { MemoryManualPaymentStore, MemoryPaymentHoldStore } from "./testSupport";

const sp = (iso: string) => new Date(`${iso}-03:00`);
const STAFF: StaffActor = { type: "STAFF", userId: "thay" };
const CREATED = sp("2026-10-01T12:00:00");

describe("autorização: só a equipe executa ações sensíveis", () => {
  it("recusa IA, sistema, cliente, vazio e identificação em branco", () => {
    for (const actor of [
      { type: "AI" },
      { type: "SYSTEM" },
      { type: "CUSTOMER", userId: "x" },
      { type: "HUMAN", ref: "a" }, // ator de conversa não é ator de painel
      { type: "STAFF" },
      { type: "STAFF", userId: "   " },
      { type: "STAFF", userId: "x".repeat(81) },
      null,
      undefined,
      "STAFF",
    ]) {
      assert.throws(() => assertStaff(actor), NotAuthorizedError, JSON.stringify(actor));
    }
    assert.doesNotThrow(() => assertStaff(STAFF));
  });
});

describe("pagamento manual: confirmar", () => {
  const input = (overrides: Partial<ConfirmManualPaymentInput> = {}): ConfirmManualPaymentInput => ({
    bookingId: "b1",
    amountBrl: 50,
    method: "PIX",
    reference: "comprovante-123",
    idempotencyKey: "chave-confirmacao-1",
    ...overrides,
  });

  it("IA, sistema e cliente não conseguem confirmar (nada é lido nem alterado)", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1" });
    for (const actor of [{ type: "AI" }, { type: "SYSTEM" }, { type: "CUSTOMER", userId: "u" }]) {
      await assert.rejects(
        () => confirmManualPayment(store, { actor: actor as never, input: input(), now: sp("2026-10-01T12:30:00") }),
        NotAuthorizedError,
      );
    }
    assert.equal(store.bookings.get("b1")?.status, "PENDING_PAYMENT");
    assert.equal(store.records.length, 0);
  });

  it("confirma dentro do prazo e registra tudo: booking, valor, método, quem, quando, referência, status anterior e novo", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:30:00");

    const result = await confirmManualPayment(store, { actor: STAFF, input: input(), now });

    assert.equal(result.kind, "confirmed");
    assert.ok(result.kind === "confirmed");
    assert.deepEqual(result.record, {
      bookingId: "b1",
      amountBrl: 50,
      method: "PIX",
      confirmedBy: "thay",
      confirmedAt: now,
      reference: "comprovante-123",
      previousStatus: "PENDING_PAYMENT",
      newStatus: "CONFIRMED",
      idempotencyKey: "chave-confirmacao-1",
    });
    assert.equal(store.bookings.get("b1")?.status, "CONFIRMED");
    assert.deepEqual(result.event, paymentConfirmedEvent(result.record));
    assert.equal(result.event.type, "PAYMENT_CONFIRMED");
  });

  it("referência é opcional", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const result = await confirmManualPayment(store, { actor: STAFF, input: input({ reference: undefined }), now: sp("2026-10-01T12:10:00") });
    assert.ok(result.kind === "confirmed");
    assert.equal(result.record.reference, null);
  });

  it("idempotente: repetir a mesma confirmação não duplica nem gera novo evento", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:10:00");

    const first = await confirmManualPayment(store, { actor: STAFF, input: input(), now });
    const second = await confirmManualPayment(store, { actor: STAFF, input: input(), now });

    assert.equal(first.kind, "confirmed");
    assert.equal(second.kind, "already_confirmed");
    assert.equal(store.records.length, 1);
  });

  it("cliques simultâneos: uma confirmação só", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:10:00");
    const results = await Promise.all([1, 2, 3].map(() => confirmManualPayment(store, { actor: STAFF, input: input(), now })));
    assert.equal(results.filter((r) => r.kind === "confirmed").length, 1);
    assert.equal(store.records.length, 1);
  });

  it("a mesma chave não pode ser reaproveitada em outro agendamento", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    store.addBooking({ id: "b2", createdAt: CREATED });
    await confirmManualPayment(store, { actor: STAFF, input: input(), now: sp("2026-10-01T12:10:00") });
    await assert.rejects(
      () => confirmManualPayment(store, { actor: STAFF, input: input({ bookingId: "b2" }), now: sp("2026-10-01T12:10:00") }),
      InvalidInputError,
    );
    assert.equal(store.bookings.get("b2")?.status, "PENDING_PAYMENT");
  });

  it("valor abaixo do sinal combinado é recusado", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED, depositAmountBrl: 200 });
    const result = await confirmManualPayment(store, { actor: STAFF, input: input({ amountBrl: 50 }), now: sp("2026-10-01T12:10:00") });
    assert.deepEqual(result, { kind: "amount_below_deposit", requiredBrl: 200 });
    assert.equal(store.records.length, 0);
  });

  it("entradas inválidas: valor, método, chave curta", async () => {
    const store = new MemoryManualPaymentStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    for (const bad of [{ amountBrl: 0 }, { amountBrl: -5 }, { amountBrl: Number.NaN }, { method: "CARD" as never }, { idempotencyKey: "x" }]) {
      await assert.rejects(() => confirmManualPayment(store, { actor: STAFF, input: input(bad), now: sp("2026-10-01T12:10:00") }), InvalidInputError);
    }
  });

  it("não confirma agendamento cancelado, concluído ou já confirmado; nem inexistente", async () => {
    const store = new MemoryManualPaymentStore();
    for (const status of ["CANCELLED", "COMPLETED", "NO_SHOW", "CONFIRMED"]) store.addBooking({ id: `b-${status}`, status });
    for (const status of ["CANCELLED", "COMPLETED", "NO_SHOW", "CONFIRMED"]) {
      const result = await confirmManualPayment(store, {
        actor: STAFF,
        input: input({ bookingId: `b-${status}`, idempotencyKey: `chave-${status}-xx` }),
        now: sp("2026-10-01T12:10:00"),
      });
      assert.deepEqual(result, { kind: "not_confirmable", status });
    }
    assert.deepEqual(
      await confirmManualPayment(store, { actor: STAFF, input: input({ bookingId: "nao-existe", idempotencyKey: "chave-nao-existe" }) }),
      { kind: "not_found" },
    );
    assert.equal(store.records.length, 0);
  });

  it("prazo vencido/expirado: confirma se o horário está livre, recusa se outra pessoa ocupou", async () => {
    const late = sp("2026-10-01T15:00:00"); // 3h depois da criação
    const free = new MemoryManualPaymentStore();
    free.addBooking({ id: "b1", createdAt: CREATED, status: "EXPIRED" });
    const ok = await confirmManualPayment(free, { actor: STAFF, input: input(), now: late });
    assert.ok(ok.kind === "confirmed");
    assert.equal(ok.record.previousStatus, "EXPIRED");

    const taken = new MemoryManualPaymentStore();
    taken.addBooking({ id: "b1", createdAt: CREATED, status: "EXPIRED" });
    taken.others.push({
      status: "CONFIRMED",
      createdAt: CREATED,
      scheduledStart: sp("2026-10-07T10:00:00"),
      scheduledEnd: sp("2026-10-07T15:00:00"),
    });
    const refused = await confirmManualPayment(taken, { actor: STAFF, input: input(), now: late });
    assert.deepEqual(refused, { kind: "slot_unavailable" });
    assert.equal(taken.bookings.get("b1")?.status, "EXPIRED");
    assert.equal(taken.records.length, 0);
  });
});

describe("prazo de pagamento: estender (ação humana, auditável)", () => {
  const base = {
    bookingId: "b1",
    newDeadline: sp("2026-10-02T12:00:00"),
    reason: "Combinado pelo WhatsApp; aguardando comprovante",
    idempotencyKey: "chave-extensao-1",
  };

  it("IA, sistema e cliente não conseguem estender", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    for (const actor of [{ type: "AI" }, { type: "SYSTEM" }, { type: "CUSTOMER", userId: "u" }]) {
      await assert.rejects(
        () => extendPaymentDeadline(store, { actor: actor as never, input: base, now: sp("2026-10-01T12:30:00") }),
        NotAuthorizedError,
      );
    }
    assert.equal(store.holds.length, 0);
  });

  it("registra quem estendeu, motivo, prazo anterior e novo prazo", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:40:00");

    const result = await extendPaymentDeadline(store, { actor: STAFF, input: base, now });

    assert.ok(result.kind === "extended");
    assert.deepEqual(result.record, {
      bookingId: "b1",
      extendedBy: "thay",
      extendedAt: now,
      reason: "Combinado pelo WhatsApp; aguardando comprovante",
      previousDeadline: sp("2026-10-01T13:00:00"), // criação + 60 min (regra geral)
      newDeadline: sp("2026-10-02T12:00:00"),
      idempotencyKey: "chave-extensao-1",
    });
    assert.equal(store.holds.length, 1);
  });

  it("o motivo é obrigatório", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    for (const reason of ["", "   ", "curto"]) {
      await assert.rejects(
        () => extendPaymentDeadline(store, { actor: STAFF, input: { ...base, reason }, now: sp("2026-10-01T12:40:00") }),
        InvalidInputError,
      );
    }
    assert.equal(store.holds.length, 0);
  });

  it("idempotente por chave", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:40:00");
    const first = await extendPaymentDeadline(store, { actor: STAFF, input: base, now });
    const second = await extendPaymentDeadline(store, { actor: STAFF, input: base, now });
    assert.equal(first.kind, "extended");
    assert.equal(second.kind, "already_extended");
    assert.equal(store.holds.length, 1);
  });

  it("valida o novo prazo: no futuro, maior que o atual, até 72h, antes do atendimento", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:40:00");
    const tryDeadline = (newDeadline: Date, key: string) =>
      extendPaymentDeadline(store, { actor: STAFF, input: { ...base, newDeadline, idempotencyKey: key }, now });

    assert.deepEqual(await tryDeadline(sp("2026-10-01T12:00:00"), "chave-passado-1"), { kind: "invalid_deadline", reason: "not_in_future" });
    assert.deepEqual(await tryDeadline(sp("2026-10-01T12:50:00"), "chave-antes-atual"), { kind: "invalid_deadline", reason: "not_after_current" });
    const tooFar = new Date(now.getTime() + (MAX_EXTENSION_HOURS + 1) * 3600_000);
    assert.deepEqual(await tryDeadline(tooFar, "chave-muito-longe"), { kind: "invalid_deadline", reason: "too_far" });

    const near = new MemoryPaymentHoldStore();
    near.addBooking({ id: "b1", createdAt: CREATED, scheduledStart: sp("2026-10-02T09:00:00") });
    const after = await extendPaymentDeadline(near, {
      actor: STAFF,
      input: { ...base, newDeadline: sp("2026-10-02T10:00:00"), idempotencyKey: "chave-depois-atend" },
      now,
    });
    assert.deepEqual(after, { kind: "invalid_deadline", reason: "after_appointment" });
    assert.equal(store.holds.length, 0);
  });

  it("só estende agendamento aguardando pagamento", async () => {
    const store = new MemoryPaymentHoldStore();
    for (const status of ["CONFIRMED", "EXPIRED", "CANCELLED"]) store.addBooking({ id: status, status });
    for (const status of ["CONFIRMED", "EXPIRED", "CANCELLED"]) {
      const result = await extendPaymentDeadline(store, {
        actor: STAFF,
        input: { ...base, bookingId: status, idempotencyKey: `chave-${status}-ext` },
        now: sp("2026-10-01T12:40:00"),
      });
      assert.deepEqual(result, { kind: "not_extendable", status });
    }
    assert.deepEqual(
      await extendPaymentDeadline(store, { actor: STAFF, input: { ...base, bookingId: "x", idempotencyKey: "chave-inexistente" }, now: sp("2026-10-01T12:40:00") }),
      { kind: "not_found" },
    );
  });

  it("extensões sucessivas partem do prazo já estendido e não podem encurtá-lo", async () => {
    const store = new MemoryPaymentHoldStore();
    store.addBooking({ id: "b1", createdAt: CREATED });
    const now = sp("2026-10-01T12:40:00");
    await extendPaymentDeadline(store, { actor: STAFF, input: base, now });

    const shorter = await extendPaymentDeadline(store, {
      actor: STAFF,
      input: { ...base, newDeadline: sp("2026-10-01T18:00:00"), idempotencyKey: "chave-encurtar-1" },
      now,
    });
    assert.deepEqual(shorter, { kind: "invalid_deadline", reason: "not_after_current" });

    const longer = await extendPaymentDeadline(store, {
      actor: STAFF,
      input: { ...base, newDeadline: sp("2026-10-03T08:00:00"), idempotencyKey: "chave-estender-2" },
      now,
    });
    assert.ok(longer.kind === "extended");
    assert.deepEqual(longer.record.previousDeadline, sp("2026-10-02T12:00:00"));
  });
});

describe("prazo efetivo (regra geral de 60 minutos continua valendo)", () => {
  const booking = { status: "PENDING_PAYMENT", createdAt: CREATED };

  it("sem extensão vale exatamente a regra geral de 60 minutos", () => {
    assert.deepEqual(effectivePaymentDeadline(booking, null), sp("2026-10-01T13:00:00"));
    assert.equal(isPaymentWindowOpenWithHold(booking, null, sp("2026-10-01T12:59:00")), true);
    assert.equal(isPaymentWindowOpenWithHold(booking, null, sp("2026-10-01T13:00:00")), false);
  });

  it("com extensão vale o maior prazo; a extensão vale só para aquele agendamento", () => {
    const hold = { newDeadline: sp("2026-10-02T12:00:00") };
    assert.deepEqual(effectivePaymentDeadline(booking, hold), sp("2026-10-02T12:00:00"));
    assert.equal(isPaymentWindowOpenWithHold(booking, hold, sp("2026-10-01T20:00:00")), true);
    assert.equal(isPaymentWindowOpenWithHold(booking, null, sp("2026-10-01T20:00:00")), false);
  });

  it("extensão menor que a regra geral nunca encurta o prazo", () => {
    assert.deepEqual(effectivePaymentDeadline(booking, { newDeadline: sp("2026-10-01T12:30:00") }), sp("2026-10-01T13:00:00"));
  });

  it("só agendamentos aguardando pagamento têm janela aberta", () => {
    assert.equal(isPaymentWindowOpenWithHold({ status: "CONFIRMED", createdAt: CREATED }, null, sp("2026-10-01T12:10:00")), false);
  });
});
