import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allowedChoices,
  amountFor,
  classifyPaidAmount,
  duplicatesToRefund,
  fullDiffersFromDeposit,
  lateCancellationRefund,
} from "./paymentOptions";

const booking = { servicePrice: 400, depositAmount: 50 };
const december = { servicePrice: 400, depositAmount: 200 };

describe("opções de pagamento", () => {
  it("o link define o que o cliente pode escolher", () => {
    assert.deepEqual(allowedChoices("CLIENT_CHOICE"), ["DEPOSIT", "FULL"]);
    assert.deepEqual(allowedChoices("DEPOSIT_ONLY"), ["DEPOSIT"]);
    assert.deepEqual(allowedChoices("FULL_ONLY"), ["FULL"]);
    assert.deepEqual(allowedChoices(null), ["DEPOSIT", "FULL"]);
  });

  it("valor de cada opção: sinal ou valor total do serviço", () => {
    assert.equal(amountFor("DEPOSIT", booking), 50);
    assert.equal(amountFor("FULL", booking), 400);
    assert.equal(amountFor("DEPOSIT", december), 200); // dezembro: 50%
    assert.equal(amountFor("FULL", december), 400);
  });

  it("serviço de até R$ 50: o sinal já é o valor total", () => {
    assert.equal(fullDiffersFromDeposit({ servicePrice: 30, depositAmount: 30 }), false);
    assert.equal(fullDiffersFromDeposit(booking), true);
  });
});

describe("o que foi pago (pelo valor informado pelo Mercado Pago)", () => {
  it("valor do serviço = total; valor do sinal = sinal", () => {
    assert.equal(classifyPaidAmount(400, booking), "FULL");
    assert.equal(classifyPaidAmount(50, booking), "DEPOSIT");
    assert.equal(classifyPaidAmount(200, december), "DEPOSIT");
    assert.equal(classifyPaidAmount(400, december), "FULL");
  });

  it("serviço barato pago inteiro no sinal conta como sinal (restante já é zero)", () => {
    assert.equal(classifyPaidAmount(30, { servicePrice: 30, depositAmount: 30 }), "DEPOSIT");
  });
});

describe("pagamento em duplicidade", () => {
  it("fica o primeiro pagamento; os outros são estornados, em qualquer ordem", () => {
    const a = { id: "p1", mpPaymentId: "1000000002" };
    const b = { id: "p2", mpPaymentId: "999999999" };
    assert.deepEqual(duplicatesToRefund([a, b]), ["p1"]);
    assert.deepEqual(duplicatesToRefund([b, a]), ["p1"]);
    assert.deepEqual(duplicatesToRefund([a]), []);
  });

  it("pagou sinal e total: fica o total e o sinal é estornado, em qualquer ordem", () => {
    const sinal = { id: "s", mpPaymentId: "100", type: "DEPOSIT" as const };
    const total = { id: "t", mpPaymentId: "200", type: "FULL" as const };
    assert.deepEqual(duplicatesToRefund([sinal, total]), ["s"]);
    assert.deepEqual(duplicatesToRefund([total, sinal]), ["s"]);
  });

  it("dois totais: fica o primeiro", () => {
    const t1 = { id: "t1", mpPaymentId: "300", type: "FULL" as const };
    const t2 = { id: "t2", mpPaymentId: "400", type: "FULL" as const };
    const sinal = { id: "s", mpPaymentId: "100", type: "DEPOSIT" as const };
    assert.deepEqual(duplicatesToRefund([t2, sinal, t1]).sort(), ["s", "t2"]);
  });
});

describe("cancelamento tardio de quem pagou o total", () => {
  it("retém só o valor do sinal e devolve o restante (uma vez)", () => {
    assert.equal(lateCancellationRefund({ paid: 400, depositAmount: 50, alreadyRefunded: 0 }), 350);
    assert.equal(lateCancellationRefund({ paid: 400, depositAmount: 200, alreadyRefunded: 0 }), 200);
    assert.equal(lateCancellationRefund({ paid: 400, depositAmount: 50, alreadyRefunded: 350 }), 0);
    assert.equal(lateCancellationRefund({ paid: 50, depositAmount: 50, alreadyRefunded: 0 }), 0);
  });
});
