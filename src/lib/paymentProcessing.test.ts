import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "@prisma/client";
import { processApprovedPayment, type PaymentProcessingStore } from "./paymentProcessing";
import type { RefundGateway } from "./cancellation";
import { isPaymentWindowOpen } from "./bookingRules";
import { makeBooking, sp } from "./testHelpers";

const NOW = sp("2026-10-01T12:00:00");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000);

class FakeStore implements PaymentProcessingStore {
  bookings: Booking[];
  payment: { id: string; status: string } | null = { id: "pay-1", status: "APPROVED" };
  constructor(bookings: Booking[]) {
    this.bookings = bookings;
  }
  get(id: string) {
    return this.bookings.find((b) => b.id === id)!;
  }
  async findBooking(id: string) {
    const b = this.bookings.find((x) => x.id === id);
    return b ? { ...b } : null;
  }
  async confirmIfPending(id: string) {
    const b = this.get(id);
    if (b.status !== "PENDING_PAYMENT") return false;
    b.status = "CONFIRMED";
    return true;
  }
  async hasOtherActiveBooking(booking: Booking, now: Date) {
    return this.bookings.some(
      (b) =>
        b.id !== booking.id &&
        (b.status === "CONFIRMED" || isPaymentWindowOpen(b, now)) &&
        b.scheduledStart < booking.scheduledEnd &&
        b.scheduledEnd > booking.scheduledStart,
    );
  }
  async reactivate(id: string) {
    const b = this.get(id);
    if (b.status !== "PENDING_PAYMENT" && b.status !== "EXPIRED") return false;
    b.status = "CONFIRMED";
    return true;
  }
  async findPaymentByMpId() {
    return this.payment;
  }
  async markPaymentRefunded(id: string) {
    if (this.payment?.id === id) this.payment.status = "REFUNDED";
  }
}

class FakeGateway implements RefundGateway {
  calls: { mpPaymentId: string; key: string }[] = [];
  fail = false;
  async refund(mpPaymentId: string, key: string) {
    this.calls.push({ mpPaymentId, key });
    if (this.fail) throw new Error("falhou");
  }
}

const slotA = { scheduledStart: sp("2026-10-07T10:00:00"), scheduledEnd: sp("2026-10-07T15:00:00") };
const params = { bookingId: "b1", mpPaymentId: "mp-1", now: NOW };

describe("processApprovedPayment: pagamento dentro do prazo", () => {
  it("confirma o agendamento aguardando pagamento", async () => {
    const store = new FakeStore([makeBooking({ id: "b1", status: "PENDING_PAYMENT", createdAt: minutesAgo(10), ...slotA })]);
    const gateway = new FakeGateway();
    assert.equal(await processApprovedPayment(params, store, gateway), "confirmed");
    assert.equal(store.get("b1").status, "CONFIRMED");
    assert.equal(gateway.calls.length, 0);
  });

  it("webhook repetido: não confirma duas vezes (não reenvia e-mail)", async () => {
    const store = new FakeStore([makeBooking({ id: "b1", status: "PENDING_PAYMENT", createdAt: minutesAgo(10), ...slotA })]);
    const gateway = new FakeGateway();
    assert.equal(await processApprovedPayment(params, store, gateway), "confirmed");
    assert.equal(await processApprovedPayment(params, store, gateway), "ignored");
    assert.equal(gateway.calls.length, 0);
  });

  it("agendamento inexistente é ignorado", async () => {
    assert.equal(await processApprovedPayment(params, new FakeStore([]), new FakeGateway()), "ignored");
  });

  it("agendamento cancelado não é reativado por um 'aprovado' atrasado", async () => {
    const store = new FakeStore([makeBooking({ id: "b1", status: "CANCELLED", ...slotA })]);
    assert.equal(await processApprovedPayment(params, store, new FakeGateway()), "ignored");
    assert.equal(store.get("b1").status, "CANCELLED");
  });
});

describe("processApprovedPayment: pagamento atrasado (prazo vencido ou EXPIRED)", () => {
  it("prazo vencido, horário livre: reconfirma", async () => {
    const store = new FakeStore([makeBooking({ id: "b1", status: "PENDING_PAYMENT", createdAt: minutesAgo(200), ...slotA })]);
    const gateway = new FakeGateway();
    assert.equal(await processApprovedPayment(params, store, gateway), "reconfirmed");
    assert.equal(store.get("b1").status, "CONFIRMED");
    assert.equal(gateway.calls.length, 0);
  });

  it("agendamento EXPIRED, horário livre: reconfirma (o cliente pagou, tem que ter horário)", async () => {
    const store = new FakeStore([makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA })]);
    const gateway = new FakeGateway();
    assert.equal(await processApprovedPayment(params, store, gateway), "reconfirmed");
    assert.equal(store.get("b1").status, "CONFIRMED");
    assert.equal(gateway.calls.length, 0);
  });

  it("agendamento EXPIRED, horário já ocupado por outro cliente: estorna o sinal", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "outro", status: "CONFIRMED", ...slotA }),
    ]);
    const gateway = new FakeGateway();

    assert.equal(await processApprovedPayment(params, store, gateway), "refunded");
    assert.equal(store.get("b1").status, "EXPIRED");
    assert.equal(gateway.calls.length, 1);
    assert.equal(gateway.calls[0].mpPaymentId, "mp-1");
    assert.equal(gateway.calls[0].key, "refund-pay-1");
    assert.equal(store.payment?.status, "REFUNDED");
  });

  it("horário ocupado por um pagamento pendente ainda dentro do prazo também bloqueia", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "outro", status: "PENDING_PAYMENT", createdAt: minutesAgo(5), ...slotA }),
    ]);
    assert.equal(await processApprovedPayment(params, store, new FakeGateway()), "refunded");
  });

  it("horário ocupado só por agendamento cancelado/expirado de outra pessoa não impede a reconfirmação", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "x1", status: "CANCELLED", ...slotA }),
      makeBooking({ id: "x2", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
    ]);
    assert.equal(await processApprovedPayment(params, store, new FakeGateway()), "reconfirmed");
  });

  it("falha no estorno é sinalizada (precisa de atenção) e nada é marcado como devolvido", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "outro", status: "CONFIRMED", ...slotA }),
    ]);
    const gateway = new FakeGateway();
    gateway.fail = true;

    assert.equal(await processApprovedPayment(params, store, gateway), "refund_failed");
    assert.equal(store.payment?.status, "APPROVED");
  });

  it("webhook repetido depois do estorno não estorna de novo", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "outro", status: "CONFIRMED", ...slotA }),
    ]);
    const gateway = new FakeGateway();

    assert.equal(await processApprovedPayment(params, store, gateway), "refunded");
    assert.equal(await processApprovedPayment(params, store, gateway), "ignored");
    assert.equal(gateway.calls.length, 1);
  });

  it("pagamento que o banco não conhece ainda assim é estornado (com chave pelo id do Mercado Pago)", async () => {
    const store = new FakeStore([
      makeBooking({ id: "b1", status: "EXPIRED", createdAt: minutesAgo(500), ...slotA }),
      makeBooking({ id: "outro", status: "CONFIRMED", ...slotA }),
    ]);
    store.payment = null;
    const gateway = new FakeGateway();

    assert.equal(await processApprovedPayment(params, store, gateway), "refunded");
    assert.equal(gateway.calls[0].key, "refund-mp-1");
  });
});
