import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDeposit, isDepositRefundable } from "./pricing";

// Todas as datas são instantes explícitos com o offset de São Paulo (-03:00),
// para o resultado não depender do fuso da máquina que roda os testes.
const sp = (iso: string) => new Date(`${iso}-03:00`);

describe("calculateDeposit", () => {
  it("cobra R$50 fixos fora de dezembro", () => {
    const r = calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-05-10T10:00:00"), isOutOfTownSeason: false });
    assert.deepEqual(r, { depositAmount: 50, depositIsPercentage: false, remainingAmount: 350 });
  });

  it("cobra 50% em dezembro", () => {
    const r = calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-12-10T10:00:00"), isOutOfTownSeason: false });
    assert.deepEqual(r, { depositAmount: 200, depositIsPercentage: true, remainingAmount: 200 });
  });

  it("cobra 50% em atendimento de temporada fora de SP", () => {
    const r = calculateDeposit({ servicePrice: 600, scheduledStart: sp("2026-05-10T10:00:00"), isOutOfTownSeason: true });
    assert.deepEqual(r, { depositAmount: 300, depositIsPercentage: true, remainingAmount: 300 });
  });

  it("nunca cobra sinal fixo maior que o valor do serviço", () => {
    const r = calculateDeposit({ servicePrice: 30, scheduledStart: sp("2026-05-10T10:00:00"), isOutOfTownSeason: false });
    assert.equal(r.depositAmount, 30);
    assert.equal(r.remainingAmount, 0);
  });

  it("arredonda para centavos", () => {
    const r = calculateDeposit({ servicePrice: 333.33, scheduledStart: sp("2026-12-01T10:00:00"), isOutOfTownSeason: false });
    assert.equal(r.depositAmount, 166.67);
    assert.equal(r.remainingAmount, 166.66);
  });

  it("dezembro é o mês do calendário de São Paulo, não o de UTC", () => {
    // 22h30 de 30/11 em SP já é 1º de dezembro em UTC: continua sinal fixo.
    const lateNovember = calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-11-30T22:30:00"), isOutOfTownSeason: false });
    assert.equal(lateNovember.depositIsPercentage, false);
    // 00h30 de 1/12 em SP: dezembro.
    const earlyDecember = calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-12-01T00:30:00"), isOutOfTownSeason: false });
    assert.equal(earlyDecember.depositIsPercentage, true);
    // 23h de 31/12 em SP já é janeiro em UTC: ainda é dezembro.
    const newYearsEve = calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-12-31T23:00:00"), isOutOfTownSeason: false });
    assert.equal(newYearsEve.depositIsPercentage, true);
  });

  it("dá o mesmo resultado com o servidor em qualquer fuso", () => {
    const original = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((tz) => {
        process.env.TZ = tz;
        return JSON.stringify(
          calculateDeposit({ servicePrice: 400, scheduledStart: sp("2026-11-30T22:30:00"), isOutOfTownSeason: false }),
        );
      });
      assert.equal(new Set(results).size, 1);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("isDepositRefundable", () => {
  const scheduledStart = sp("2026-06-10T14:00:00");

  it("devolve com 2 ou mais dias de antecedência", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-08T23:00:00") }), true);
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-01T10:00:00") }), true);
  });

  it("não devolve com 1 dia de antecedência", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-09T08:00:00") }), false);
  });

  it("não devolve no mesmo dia nem depois do atendimento", () => {
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-10T08:00:00") }), false);
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-11T10:00:00") }), false);
  });

  it("à noite em SP (já 'amanhã' em UTC) o cliente não perde a devolução a que tem direito", () => {
    // 21h30 de 8/6 em SP = 00h30 de 9/6 em UTC. Em UTC seriam só 1 dia: bug antigo.
    const cancelledAt = sp("2026-06-08T21:30:00");
    assert.equal(cancelledAt.toISOString(), "2026-06-09T00:30:00.000Z");
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: cancelledAt }), true);
  });

  it("a virada da meia-noite de SP é a fronteira da regra", () => {
    // 00h00 de 8/6 (2 dias antes) ainda devolve; 00h00 de 9/6 (1 dia antes) não.
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-08T00:00:00") }), true);
    assert.equal(isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-09T00:00:00") }), false);
  });

  it("dá o mesmo resultado com o servidor em qualquer fuso", () => {
    const original = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((tz) => {
        process.env.TZ = tz;
        return isDepositRefundable({ scheduledStart, cancellationRequestedAt: sp("2026-06-08T21:30:00") });
      });
      assert.deepEqual(results, [true, true, true]);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
