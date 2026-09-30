import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "@prisma/client";
import { cancelBooking, type CancellationStore, type RefundGateway } from "./cancellation";
import { makeBooking, sp } from "./testHelpers";

type FakePayment = { id: string; mpPaymentId: string; status: string };

class FakeStore implements CancellationStore {
  booking: Booking | null;
  payments: FakePayment[];
  constructor(booking: Booking | null, payments: FakePayment[] = []) {
    this.booking = booking;
    this.payments = payments;
  }
  async findBooking(id: string) {
    return this.booking && this.booking.id === id ? { ...this.booking } : null;
  }
  async findApprovedDeposit() {
    const p = this.payments.find((x) => x.status === "APPROVED");
    return p ? { id: p.id, mpPaymentId: p.mpPaymentId } : null;
  }
  async claimCancellation(bookingId: string, data: { cancelledAt: Date; refundEligible: boolean | null }) {
    if (!this.booking || this.booking.id !== bookingId) return null;
    if (this.booking.status !== "PENDING_PAYMENT" && this.booking.status !== "CONFIRMED") return null;
    this.booking = {
      ...this.booking,
      status: "CANCELLED",
      cancelledAt: data.cancelledAt,
      cancellationRefundedDeposit: data.refundEligible,
    };
    return { ...this.booking };
  }
  async markDepositRefunded(paymentId: string) {
    const p = this.payments.find((x) => x.id === paymentId);
    if (p && p.status !== "REFUNDED") p.status = "REFUNDED";
  }
}

class FakeGateway implements RefundGateway {
  calls: { mpPaymentId: string; key: string }[] = [];
  failTimes = 0;
  async refund(mpPaymentId: string, key: string) {
    this.calls.push({ mpPaymentId, key });
    if (this.failTimes > 0) {
      this.failTimes -= 1;
      throw new Error("Mercado Pago indisponível");
    }
  }
}

const APPOINTMENT = sp("2026-06-10T14:00:00");
const paid = (): FakePayment => ({ id: "pay-1", mpPaymentId: "mp-123", status: "APPROVED" });
const confirmedBooking = () => makeBooking({ id: "b1", status: "CONFIRMED", scheduledStart: APPOINTMENT });

describe("cancelBooking: regra de devolução", () => {
  it("cliente cancela com 2 dias ou mais: cancela e estorna o sinal uma única vez", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const result = await cancelBooking({ bookingId: "b1", now: sp("2026-06-08T09:00:00") }, store, gateway);

    assert.ok(result.kind === "cancelled");
    assert.equal(result.depositRefunded, true);
    assert.equal(result.refundError, false);
    assert.equal(result.refundEligible, true);
    assert.equal(result.booking.status, "CANCELLED");
    assert.equal(gateway.calls.length, 1);
    assert.equal(gateway.calls[0].mpPaymentId, "mp-123");
    assert.equal(store.payments[0].status, "REFUNDED");
    assert.equal(store.booking?.cancellationRefundedDeposit, true);
  });

  it("cliente cancela com 1 dia: cancela sem estornar", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const result = await cancelBooking({ bookingId: "b1", now: sp("2026-06-09T09:00:00") }, store, gateway);

    assert.ok(result.kind === "cancelled");
    assert.equal(result.depositRefunded, false);
    assert.equal(result.refundEligible, false);
    assert.equal(gateway.calls.length, 0);
    assert.equal(store.payments[0].status, "APPROVED");
    assert.equal(store.booking?.cancellationRefundedDeposit, false);
  });

  it("cliente cancela no mesmo dia: não estorna", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    await cancelBooking({ bookingId: "b1", now: sp("2026-06-10T07:00:00") }, store, gateway);
    assert.equal(gateway.calls.length, 0);
  });

  it("estúdio cancela (não pôde atender): sempre devolve o sinal, mesmo em cima da hora", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const result = await cancelBooking(
      { bookingId: "b1", initiator: "studio", now: sp("2026-06-10T07:00:00") },
      store,
      gateway,
    );
    assert.ok(result.kind === "cancelled");
    assert.equal(result.depositRefunded, true);
    assert.equal(gateway.calls.length, 1);
  });

  it("fuso: cancelar às 21h30 de SP, 2 dias antes, ainda devolve (em UTC já seria 'amanhã')", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const result = await cancelBooking({ bookingId: "b1", now: sp("2026-06-08T21:30:00") }, store, gateway);
    assert.ok(result.kind === "cancelled");
    assert.equal(result.depositRefunded, true);
  });
});

describe("cancelBooking: só estorna quando realmente aplicável", () => {
  it("agendamento sem sinal pago: cancela, não chama o Mercado Pago e não marca devolução", async () => {
    const pending = makeBooking({ id: "b1", status: "PENDING_PAYMENT", scheduledStart: APPOINTMENT });
    const store = new FakeStore(pending, [{ id: "pay-1", mpPaymentId: "mp-1", status: "PENDING" }]);
    const gateway = new FakeGateway();
    const result = await cancelBooking({ bookingId: "b1", now: sp("2026-06-01T09:00:00") }, store, gateway);

    assert.ok(result.kind === "cancelled");
    assert.equal(result.depositRefunded, false);
    assert.equal(gateway.calls.length, 0);
    assert.equal(store.booking?.cancellationRefundedDeposit, null);
  });

  it("agendamento inexistente", async () => {
    const result = await cancelBooking({ bookingId: "nope" }, new FakeStore(null), new FakeGateway());
    assert.deepEqual(result, { kind: "not_found" });
  });

  for (const status of ["COMPLETED", "NO_SHOW", "EXPIRED"] as const) {
    it(`não cancela agendamento ${status}`, async () => {
      const store = new FakeStore(makeBooking({ id: "b1", status, scheduledStart: APPOINTMENT }), [paid()]);
      const gateway = new FakeGateway();
      const result = await cancelBooking({ bookingId: "b1", now: sp("2026-06-01T09:00:00") }, store, gateway);
      assert.equal(result.kind, "not_cancellable");
      assert.equal(gateway.calls.length, 0);
      assert.equal(store.booking?.status, status);
    });
  }
});

describe("cancelBooking: sem estorno duplicado", () => {
  it("chamar o cancelamento de novo depois de estornado não estorna outra vez", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const now = sp("2026-06-08T09:00:00");

    await cancelBooking({ bookingId: "b1", now }, store, gateway);
    const second = await cancelBooking({ bookingId: "b1", now }, store, gateway);

    assert.equal(second.kind, "already_cancelled");
    assert.equal(gateway.calls.length, 1);
  });

  it("duas chamadas simultâneas: só uma estorna", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const now = sp("2026-06-08T09:00:00");

    const results = await Promise.all([
      cancelBooking({ bookingId: "b1", now }, store, gateway),
      cancelBooking({ bookingId: "b1", now }, store, gateway),
      cancelBooking({ bookingId: "b1", now }, store, gateway),
    ]);

    assert.equal(gateway.calls.length, 1);
    assert.equal(results.filter((r) => r.kind === "cancelled").length, 1);
    assert.equal(results.filter((r) => r.kind === "already_cancelled").length, 2);
  });

  it("a chave de idempotência é fixa por pagamento", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    await cancelBooking({ bookingId: "b1", now: sp("2026-06-08T09:00:00") }, store, gateway);
    assert.equal(gateway.calls[0].key, "refund-pay-1");
  });

  it("falha no estorno não desfaz o cancelamento; tentar de novo estorna com a mesma chave", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    gateway.failTimes = 1;
    const now = sp("2026-06-08T09:00:00");

    const first = await cancelBooking({ bookingId: "b1", now }, store, gateway);
    assert.ok(first.kind === "cancelled");
    assert.equal(first.refundError, true);
    assert.equal(first.depositRefunded, false);
    assert.equal(store.booking?.status, "CANCELLED");
    assert.equal(store.payments[0].status, "APPROVED");

    const retry = await cancelBooking({ bookingId: "b1", now }, store, gateway);
    assert.ok(retry.kind === "already_cancelled");
    assert.equal(retry.depositRefunded, true);
    assert.equal(store.payments[0].status, "REFUNDED");
    assert.equal(gateway.calls.length, 2);
    assert.equal(gateway.calls[0].key, gateway.calls[1].key);

    await cancelBooking({ bookingId: "b1", now }, store, gateway);
    assert.equal(gateway.calls.length, 2);
  });

  it("um cancelamento sem direito a devolução nunca é estornado por uma chamada repetida", async () => {
    const store = new FakeStore(confirmedBooking(), [paid()]);
    const gateway = new FakeGateway();
    const now = sp("2026-06-09T09:00:00"); // 1 dia antes

    await cancelBooking({ bookingId: "b1", now }, store, gateway);
    await cancelBooking({ bookingId: "b1", now }, store, gateway);
    await cancelBooking({ bookingId: "b1", now: sp("2026-06-01T09:00:00") }, store, gateway);

    assert.equal(gateway.calls.length, 0);
    assert.equal(store.payments[0].status, "APPROVED");
  });
});
