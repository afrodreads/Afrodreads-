import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDeposit, isDepositRefundable } from "./pricing";

// Datas construídas em horário local, o mesmo que as funções usam.
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("calculateDeposit", () => {
  it("cobra R$50 fixos fora de dezembro", () => {
    const r = calculateDeposit({ servicePrice: 400, scheduledStart: at(2026, 5, 10), isOutOfTownSeason: false });
    assert.deepEqual(r, { depositAmount: 50, depositIsPercentage: false, remainingAmount: 350 });
  });

  it("cobra 50% em dezembro", () => {
    const r = calculateDeposit({ servicePrice: 400, scheduledStart: at(2026, 12, 10), isOutOfTownSeason: false });
    assert.deepEqual(r, { depositAmount: 200, depositIsPercentage: true, remainingAmount: 200 });
  });

  it("cobra 50% em atendimento de temporada fora de SP", () => {
    const r = calculateDeposit({ servicePrice: 600, scheduledStart: at(2026, 5, 10), isOutOfTownSeason: true });
    assert.deepEqual(r, { depositAmount: 300, depositIsPercentage: true, remainingAmount: 300 });
  });

  it("nunca cobra sinal fixo maior que o valor do serviço", () => {
    const r = calculateDeposit({ servicePrice: 30, scheduledStart: at(2026, 5, 10), isOutOfTownSeason: false });
    assert.equal(r.depositAmount, 30);
    assert.equal(r.remainingAmount, 0);
  });

  it("arredonda para centavos", () => {
    const r = calculateDeposit({ servicePrice: 333.33, scheduledStart: at(2026, 12, 1), isOutOfTownSeason: false });
    assert.equal(r.depositAmount, 166.67);
    assert.equal(r.remainingAmount, 166.66);
  });
});

describe("isDepositRefundable", () => {
  const scheduledStart = at(2026, 6, 10, 14);

  it("devolve com 2 ou mais dias de antecedência", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: at(2026, 6, 8, 23) }), true);
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: at(2026, 6, 1) }), true);
  });

  it("não devolve com 1 dia de antecedência", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: at(2026, 6, 9, 8) }), false);
  });

  it("não devolve no mesmo dia nem depois do atendimento", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: at(2026, 6, 10, 8) }), false);
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: at(2026, 6, 11) }), false);
  });
});
