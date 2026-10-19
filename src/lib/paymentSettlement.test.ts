import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bookingPaymentFields, resolveDuplicatePayments, type ApprovedPayment, type SettlementStore } from "./paymentSettlement";

class FakeStore implements SettlementStore {
  constructor(public payments: ApprovedPayment[]) {}
  refundedMarks: string[] = [];
  async listApprovedPayments() {
    return this.payments.filter((p) => !this.refundedMarks.includes(p.id));
  }
  async markPaymentRefunded(id: string) {
    this.refundedMarks.push(id);
  }
}

class FakeGateway {
  calls: { mpPaymentId: string; key: string }[] = [];
  failFor = new Set<string>();
  async refund(mpPaymentId: string, key: string) {
    if (this.failFor.has(mpPaymentId)) throw new Error("mercado pago fora do ar");
    this.calls.push({ mpPaymentId, key });
  }
}

const deposit: ApprovedPayment = { id: "pay-dep", mpPaymentId: "100", type: "DEPOSIT" };
const full: ApprovedPayment = { id: "pay-full", mpPaymentId: "200", type: "FULL" };

describe("pagamento em duplicidade (sinal e total pagos no mesmo agendamento)", () => {
  it("fica o primeiro pagamento e o segundo é estornado", async () => {
    const store = new FakeStore([full, deposit]);
    const gateway = new FakeGateway();
    const result = await resolveDuplicatePayments("b1", store, gateway);
    assert.equal(result.keeper?.id, "pay-dep");
    assert.deepEqual(result.refunded, ["pay-full"]);
    assert.deepEqual(gateway.calls, [{ mpPaymentId: "200", key: "refund-pay-full" }]);
    assert.deepEqual(store.refundedMarks, ["pay-full"]);
  });

  it("webhooks repetidos não estornam de novo (o estornado sai da lista; a chave é a mesma)", async () => {
    const store = new FakeStore([deposit, full]);
    const gateway = new FakeGateway();
    await resolveDuplicatePayments("b1", store, gateway);
    const again = await resolveDuplicatePayments("b1", store, gateway);
    assert.deepEqual(again.refunded, []);
    assert.equal(gateway.calls.length, 1);
  });

  it("um único pagamento aprovado: nada a estornar", async () => {
    const result = await resolveDuplicatePayments("b1", new FakeStore([full]), new FakeGateway());
    assert.equal(result.keeper?.id, "pay-full");
    assert.deepEqual(result.refunded, []);
  });

  it("falha no estorno fica registrada e o pagamento continua aprovado (tenta de novo no próximo webhook)", async () => {
    const store = new FakeStore([deposit, full]);
    const gateway = new FakeGateway();
    gateway.failFor.add("200");
    const result = await resolveDuplicatePayments("b1", store, gateway);
    assert.deepEqual(result.failed, ["pay-full"]);
    assert.deepEqual(store.refundedMarks, []);
  });
});

describe("agendamento conforme o que ficou pago", () => {
  it("valor total: nada a pagar no dia", () => {
    assert.deepEqual(bookingPaymentFields("FULL", { servicePrice: 400, depositAmount: 50 }), { paymentOption: "FULL", remainingAmount: 0 });
  });

  it("sinal: o restante é pago no dia", () => {
    assert.deepEqual(bookingPaymentFields("DEPOSIT", { servicePrice: 400, depositAmount: 200 }), {
      paymentOption: "DEPOSIT",
      remainingAmount: 200,
    });
  });
});
