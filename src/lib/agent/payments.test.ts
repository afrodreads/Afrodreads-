import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InvalidInputError } from "../conversations/errors";
import { authorizeStaff, NotAuthorizedError, type StaffActor } from "./actors";
import { confirmManualPayment, type ConfirmManualPaymentInput } from "./manualPayment";
import { DEFAULT_PAYMENT_HOLD_POLICY, extendPaymentDeadline, type ExtendPaymentDeadlineInput } from "./paymentHold";
import { MemoryManualPaymentStore, MemoryPaymentHoldStore, staff } from "./testSupport";

const sp = (iso: string) => new Date(`${iso}-03:00`);
const CREATED = sp("2026-10-01T12:00:00");
const ATTENDANT: StaffActor = { type: "STAFF", staffId: "staff-1" };

describe("equipe: autorização e isolamento entre unidades", () => {
  const directory = (records = [staff()]) => ({
    findStaff: async (id: string) => records.find((r) => r.id === id) ?? null,
  });

  it("IA, SYSTEM, cliente e atores malformados são recusados antes de qualquer consulta", async () => {
    let lookups = 0;
    const counting = { findStaff: async () => { lookups += 1; return staff(); } };
    for (const actor of [{ type: "AI" }, { type: "SYSTEM" }, { type: "CUSTOMER", staffId: "x" }, { type: "HUMAN", ref: "a" }, { type: "STAFF" }, { type: "STAFF", staffId: " " }, null, "STAFF"]) {
      await assert.rejects(() => authorizeStaff(counting, actor, "CONFIRM_MANUAL_PAYMENT", { unitId: "unit-a" }), NotAuthorizedError);
    }
    assert.equal(lookups, 0);
  });

  it("usuário inexistente ou inativo é recusado", async () => {
    await assert.rejects(() => authorizeStaff(directory(), { type: "STAFF", staffId: "nao-existe" }, "CONFIRM_MANUAL_PAYMENT", { unitId: "unit-a" }), (e: NotAuthorizedError) => e.reason === "unknown_staff");
    await assert.rejects(() => authorizeStaff(directory([staff({ active: false })]), ATTENDANT, "CONFIRM_MANUAL_PAYMENT", { unitId: "unit-a" }), (e: NotAuthorizedError) => e.reason === "inactive_staff");
  });

  it("atendente só age na própria unidade; ADMIN sem unidade age em todas", async () => {
    await assert.rejects(() => authorizeStaff(directory(), ATTENDANT, "CONFIRM_MANUAL_PAYMENT", { unitId: "unit-b" }), (e: NotAuthorizedError) => e.reason === "other_unit");
    const ok = await authorizeStaff(directory(), ATTENDANT, "EXTEND_PAYMENT_DEADLINE", { unitId: "unit-a" });
    assert.equal(ok.id, "staff-1");

    const admin = staff({ id: "admin", role: "ADMIN", unitId: null });
    for (const unitId of ["unit-a", "unit-b", null]) {
      assert.equal((await authorizeStaff(directory([admin]), { type: "STAFF", staffId: "admin" }, "CONFIRM_MANUAL_PAYMENT", { unitId })).id, "admin");
    }
  });

  it("recurso sem unidade (agendamento antigo): só ADMIN", async () => {
    await assert.rejects(() => authorizeStaff(directory(), ATTENDANT, "CONFIRM_MANUAL_PAYMENT", { unitId: null }), NotAuthorizedError);
    const unitAdmin = staff({ id: "adm-a", role: "ADMIN", unitId: "unit-a" });
    assert.equal((await authorizeStaff(directory([unitAdmin]), { type: "STAFF", staffId: "adm-a" }, "CONFIRM_MANUAL_PAYMENT", { unitId: null })).id, "adm-a");
    await assert.rejects(() => authorizeStaff(directory([unitAdmin]), { type: "STAFF", staffId: "adm-a" }, "CONFIRM_MANUAL_PAYMENT", { unitId: "unit-b" }), NotAuthorizedError);
  });
});

describe("PaymentConfirmation (confirmação manual)", () => {
  const input = (overrides: Partial<ConfirmManualPaymentInput> = {}): ConfirmManualPaymentInput => ({
    bookingId: "b1",
    amountBrl: 50,
    method: "PIX",
    reference: "comprovante-123",
    idempotencyKey: "chave-confirmacao-1",
    ...overrides,
  });
  const store = () => {
    const s = new MemoryManualPaymentStore();
    s.addStaff(staff());
    s.addBooking({ id: "b1", createdAt: CREATED });
    return s;
  };

  it("IA, cliente e SYSTEM não confirmam (nada alterado)", async () => {
    const s = store();
    for (const actor of [{ type: "AI" }, { type: "SYSTEM" }, { type: "CUSTOMER", staffId: "staff-1" }]) {
      await assert.rejects(() => confirmManualPayment(s, { actor: actor as never, input: input(), now: sp("2026-10-01T12:30:00") }), NotAuthorizedError);
    }
    assert.equal(s.bookings.get("b1")?.status, "PENDING_PAYMENT");
    assert.equal(s.records.length, 0);
    assert.equal(s.outbox.length, 0);
  });

  it("registra booking, valor, método, usuário, data, comprovante e status anterior/novo; e enfileira PAYMENT_CONFIRMED", async () => {
    const s = store();
    const now = sp("2026-10-01T12:30:00");
    const result = await confirmManualPayment(s, { actor: ATTENDANT, input: input(), now });

    assert.ok(result.kind === "confirmed");
    assert.deepEqual(result.record, {
      bookingId: "b1",
      amountBrl: 50,
      method: "PIX",
      confirmedById: "staff-1",
      confirmedAt: now,
      reference: "comprovante-123",
      previousStatus: "PENDING_PAYMENT",
      newStatus: "CONFIRMED",
      idempotencyKey: "chave-confirmacao-1",
    });
    assert.equal(s.bookings.get("b1")?.status, "CONFIRMED");
    assert.equal(s.outbox.length, 1);
    assert.equal(s.outbox[0].type, "PAYMENT_CONFIRMED");
    assert.equal(s.outbox[0].idempotencyKey, "payment-confirmed:b1");
  });

  it("métodos aceitos: PIX, DEPOSIT, TRANSFER (e só eles)", async () => {
    for (const method of ["PIX", "DEPOSIT", "TRANSFER"] as const) {
      const s = store();
      const result = await confirmManualPayment(s, { actor: ATTENDANT, input: input({ method }), now: sp("2026-10-01T12:10:00") });
      assert.equal(result.kind, "confirmed", method);
    }
    for (const method of ["CARD", "CASH", "BANK_DEPOSIT"]) {
      await assert.rejects(() => confirmManualPayment(store(), { actor: ATTENDANT, input: input({ method: method as never }) }), InvalidInputError);
    }
  });

  it("idempotente e à prova de cliques simultâneos: uma confirmação, um evento", async () => {
    const s = store();
    const now = sp("2026-10-01T12:10:00");
    const results = await Promise.all([1, 2, 3].map(() => confirmManualPayment(s, { actor: ATTENDANT, input: input(), now })));
    assert.equal(results.filter((r) => r.kind === "confirmed").length, 1);
    assert.equal(s.records.length, 1);
    assert.equal(s.outbox.length, 1);
    assert.equal((await confirmManualPayment(s, { actor: ATTENDANT, input: input(), now })).kind, "already_confirmed");
  });

  it("atendente de outra unidade não confirma", async () => {
    const s = store();
    s.addBooking({ id: "b2", unitId: "unit-b", createdAt: CREATED });
    await assert.rejects(
      () => confirmManualPayment(s, { actor: ATTENDANT, input: input({ bookingId: "b2", idempotencyKey: "chave-outra-unid" }) }),
      NotAuthorizedError,
    );
    assert.equal(s.bookings.get("b2")?.status, "PENDING_PAYMENT");
  });

  it("valida valor, sinal, status e horário ocupado", async () => {
    const low = store();
    low.bookings.get("b1")!.depositAmountBrl = 200;
    assert.deepEqual(await confirmManualPayment(low, { actor: ATTENDANT, input: input(), now: sp("2026-10-01T12:10:00") }), { kind: "amount_below_deposit", requiredBrl: 200 });

    for (const bad of [{ amountBrl: 0 }, { amountBrl: -5 }, { amountBrl: Number.NaN }, { idempotencyKey: "x" }]) {
      await assert.rejects(() => confirmManualPayment(store(), { actor: ATTENDANT, input: input(bad) }), InvalidInputError);
    }

    const cancelled = store();
    cancelled.bookings.get("b1")!.status = "CANCELLED";
    assert.deepEqual(await confirmManualPayment(cancelled, { actor: ATTENDANT, input: input() }), { kind: "not_confirmable", status: "CANCELLED" });

    const taken = store();
    taken.bookings.get("b1")!.status = "EXPIRED";
    taken.others.push({ status: "CONFIRMED", createdAt: CREATED, paymentDueAt: null, scheduledStart: sp("2026-10-07T10:00:00"), scheduledEnd: sp("2026-10-07T15:00:00") });
    assert.deepEqual(await confirmManualPayment(taken, { actor: ATTENDANT, input: input(), now: sp("2026-10-01T15:00:00") }), { kind: "slot_unavailable" });
    assert.equal(taken.records.length, 0);
  });
});

describe("PaymentHold (extensão manual do prazo)", () => {
  const base: ExtendPaymentDeadlineInput = {
    bookingId: "b1",
    newDeadline: sp("2026-10-02T12:00:00"),
    reason: "Combinado pelo WhatsApp; aguardando comprovante",
    idempotencyKey: "chave-extensao-1",
  };
  const store = () => {
    const s = new MemoryPaymentHoldStore();
    s.addStaff(staff());
    s.addBooking({ id: "b1", createdAt: CREATED });
    return s;
  };
  const NOW = sp("2026-10-01T12:40:00");

  it("IA, SYSTEM e cliente não conseguem estender", async () => {
    const s = store();
    for (const actor of [{ type: "AI" }, { type: "SYSTEM" }, { type: "CUSTOMER", staffId: "staff-1" }]) {
      await assert.rejects(() => extendPaymentDeadline(s, { actor: actor as never, input: base, now: NOW }), NotAuthorizedError);
    }
    assert.equal(s.holds.length, 0);
    assert.equal(s.bookings.get("b1")?.paymentDueAt, null);
  });

  it("grava o novo prazo no agendamento e a auditoria (anterior, novo, quem, motivo)", async () => {
    const s = store();
    const result = await extendPaymentDeadline(s, { actor: ATTENDANT, input: base, now: NOW });
    assert.ok(result.kind === "extended");
    assert.deepEqual(result.record, {
      bookingId: "b1",
      previousDeadline: sp("2026-10-01T13:00:00"),
      newDeadline: sp("2026-10-02T12:00:00"),
      reason: "Combinado pelo WhatsApp; aguardando comprovante",
      extendedById: "staff-1",
      extendedAt: NOW,
      idempotencyKey: "chave-extensao-1",
    });
    assert.deepEqual(s.bookings.get("b1")?.paymentDueAt, sp("2026-10-02T12:00:00"));
  });

  it("idempotente e sem duplicar em paralelo", async () => {
    const s = store();
    const results = await Promise.all([1, 2, 3].map(() => extendPaymentDeadline(s, { actor: ATTENDANT, input: base, now: NOW })));
    assert.equal(results.filter((r) => r.kind === "extended").length, 1);
    assert.equal(s.holds.length, 1);
  });

  it("motivo obrigatório e prazo validado (futuro, maior que o atual, dentro do limite, antes do atendimento)", async () => {
    for (const reason of ["", "   ", "curto"]) {
      await assert.rejects(() => extendPaymentDeadline(store(), { actor: ATTENDANT, input: { ...base, reason }, now: NOW }), InvalidInputError);
    }
    const s = store();
    const at = (iso: string, key: string) => extendPaymentDeadline(s, { actor: ATTENDANT, input: { ...base, newDeadline: sp(iso), idempotencyKey: key }, now: NOW });
    assert.deepEqual(await at("2026-10-01T12:00:00", "chave-passado-1"), { kind: "invalid_deadline", reason: "not_in_future" });
    assert.deepEqual(await at("2026-10-01T12:50:00", "chave-antes-atual"), { kind: "invalid_deadline", reason: "not_after_current" });
    assert.deepEqual(await at("2026-10-05T12:00:00", "chave-muito-longe"), { kind: "invalid_deadline", reason: "too_far" });
    const near = store();
    near.bookings.get("b1")!.scheduledStart = sp("2026-10-02T09:00:00");
    assert.deepEqual(
      await extendPaymentDeadline(near, { actor: ATTENDANT, input: { ...base, newDeadline: sp("2026-10-02T10:00:00") }, now: NOW }),
      { kind: "invalid_deadline", reason: "after_appointment" },
    );
    assert.equal(s.holds.length, 0);
  });

  it("o limite é política configurável (72h por padrão)", async () => {
    assert.equal(DEFAULT_PAYMENT_HOLD_POLICY.maxExtensionHours, 72);
    const s = store();
    const strict = { maxExtensionHours: 6, minReasonLength: 10 };
    assert.deepEqual(
      await extendPaymentDeadline(s, { actor: ATTENDANT, input: base, now: NOW, policy: strict }),
      { kind: "invalid_deadline", reason: "too_far" },
    );
    const ok = await extendPaymentDeadline(s, {
      actor: ATTENDANT,
      input: { ...base, newDeadline: sp("2026-10-01T18:00:00"), idempotencyKey: "chave-politica" },
      now: NOW,
      policy: strict,
    });
    assert.equal(ok.kind, "extended");
  });

  it("não estende confirmado/expirado/cancelado; atendente de outra unidade é recusado", async () => {
    for (const status of ["CONFIRMED", "EXPIRED", "CANCELLED"]) {
      const s = store();
      s.bookings.get("b1")!.status = status;
      assert.deepEqual(await extendPaymentDeadline(s, { actor: ATTENDANT, input: base, now: NOW }), { kind: "not_extendable", status });
    }
    const other = store();
    other.bookings.get("b1")!.unitId = "unit-b";
    await assert.rejects(() => extendPaymentDeadline(other, { actor: ATTENDANT, input: base, now: NOW }), NotAuthorizedError);
  });

  it("extensões sucessivas partem do prazo já estendido e nunca o encurtam", async () => {
    const s = store();
    await extendPaymentDeadline(s, { actor: ATTENDANT, input: base, now: NOW });
    assert.deepEqual(
      await extendPaymentDeadline(s, { actor: ATTENDANT, input: { ...base, newDeadline: sp("2026-10-01T18:00:00"), idempotencyKey: "chave-encurtar" }, now: NOW }),
      { kind: "invalid_deadline", reason: "not_after_current" },
    );
    const longer = await extendPaymentDeadline(s, { actor: ATTENDANT, input: { ...base, newDeadline: sp("2026-10-03T08:00:00"), idempotencyKey: "chave-estender-2" }, now: NOW });
    assert.ok(longer.kind === "extended");
    assert.deepEqual(longer.record.previousDeadline, sp("2026-10-02T12:00:00"));
  });
});
