import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeBookingWhere, effectivePaymentDeadline, isPaymentWindowOpen, pendingPaymentCutoff } from "./bookingRules";
import { expireStaleBookings, type ExpiryStore, type PendingBooking } from "./bookingExpiry";

// Prazo estendido pela equipe (Booking.paymentDueAt) integrado às regras da
// Fase 0. Sem extensão (nulo), tudo continua exatamente como antes.

const sp = (iso: string) => new Date(`${iso}-03:00`);
const CREATED = sp("2026-10-01T12:00:00");

describe("prazo efetivo de pagamento", () => {
  it("sem extensão: a regra geral de 60 minutos, como antes", () => {
    const booking = { status: "PENDING_PAYMENT", createdAt: CREATED, paymentDueAt: null };
    assert.deepEqual(effectivePaymentDeadline(booking), sp("2026-10-01T13:00:00"));
    assert.equal(isPaymentWindowOpen(booking, sp("2026-10-01T12:59:00")), true);
    assert.equal(isPaymentWindowOpen(booking, sp("2026-10-01T13:00:00")), false);
    // Agendamentos antigos sem o campo continuam funcionando.
    assert.equal(isPaymentWindowOpen({ status: "PENDING_PAYMENT", createdAt: CREATED }, sp("2026-10-01T12:30:00")), true);
  });

  it("com extensão: vale o prazo estendido, só para aquele agendamento", () => {
    const held = { status: "PENDING_PAYMENT", createdAt: CREATED, paymentDueAt: sp("2026-10-02T12:00:00") };
    assert.equal(isPaymentWindowOpen(held, sp("2026-10-01T20:00:00")), true);
    assert.equal(isPaymentWindowOpen(held, sp("2026-10-02T12:00:00")), false);
  });

  it("uma extensão menor que a regra geral nunca encurta o prazo", () => {
    assert.deepEqual(effectivePaymentDeadline({ createdAt: CREATED, paymentDueAt: sp("2026-10-01T12:10:00") }), sp("2026-10-01T13:00:00"));
  });

  it("só PENDING_PAYMENT tem janela aberta", () => {
    assert.equal(isPaymentWindowOpen({ status: "CONFIRMED", createdAt: CREATED, paymentDueAt: sp("2026-10-02T12:00:00") }, sp("2026-10-01T12:10:00")), false);
  });

  it("a agenda considera ocupado o agendamento com prazo estendido ainda válido", () => {
    const now = sp("2026-10-01T20:00:00");
    const where = activeBookingWhere(now);
    assert.deepEqual(where, {
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING_PAYMENT", createdAt: { gt: pendingPaymentCutoff(now) } },
        { status: "PENDING_PAYMENT", paymentDueAt: { gt: now } },
      ],
    });
  });
});

describe("expiração diária respeita a extensão", () => {
  class Store implements ExpiryStore {
    constructor(public rows: (PendingBooking & { status: string })[]) {}
    async findPendingCreatedUntil() {
      return this.rows.filter((r) => r.status === "PENDING_PAYMENT");
    }
    async expire(id: string, now: Date) {
      const row = this.rows.find((r) => r.id === id);
      if (!row || row.status !== "PENDING_PAYMENT") return false;
      if (row.paymentDueAt && row.paymentDueAt.getTime() > now.getTime()) return false;
      row.status = "EXPIRED";
      return true;
    }
  }

  it("não expira quem tem prazo estendido válido; expira quando o novo prazo passa", async () => {
    const store = new Store([
      { id: "held", status: "PENDING_PAYMENT", hasApprovedPayment: false, paymentDueAt: sp("2026-10-02T12:00:00") },
      { id: "normal", status: "PENDING_PAYMENT", hasApprovedPayment: false, paymentDueAt: null },
    ]);

    const first = await expireStaleBookings(store, sp("2026-10-01T20:00:00"));
    assert.deepEqual(first, { checked: 2, expired: 1, skippedPaid: 0, skippedHeld: 1 });
    assert.equal(store.rows[0].status, "PENDING_PAYMENT");

    const later = await expireStaleBookings(store, sp("2026-10-02T12:30:00"));
    assert.deepEqual(later, { checked: 1, expired: 1, skippedPaid: 0, skippedHeld: 0 });
    assert.equal(store.rows[0].status, "EXPIRED");
  });

  it("se a equipe estender entre a consulta e a troca, a troca atômica não expira", async () => {
    const store = new Store([{ id: "race", status: "PENDING_PAYMENT", hasApprovedPayment: false, paymentDueAt: null }]);
    const originalFind = store.findPendingCreatedUntil.bind(store);
    store.findPendingCreatedUntil = async () => {
      const found = await originalFind();
      store.rows[0].paymentDueAt = sp("2026-10-03T12:00:00"); // extensão no meio do caminho
      return found.map((row) => ({ ...row, paymentDueAt: null }));
    };
    const report = await expireStaleBookings(store, sp("2026-10-01T20:00:00"));
    assert.equal(report.expired, 0);
    assert.equal(store.rows[0].status, "PENDING_PAYMENT");
  });
});
