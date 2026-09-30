import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAvailableStartTimes, isOfferedStartTime } from "./schedule";

// Dia de calendário consultado = meia-noite UTC (formato da API de agenda).
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe("getAvailableStartTimes", () => {
  const wednesday = day(2026, 10, 7);

  it("oferece 10h e 15h de São Paulo (13h e 18h UTC) para serviços curtos", () => {
    assert.deepEqual(iso(getAvailableStartTimes(wednesday, 5, [])), [
      "2026-10-07T13:00:00.000Z",
      "2026-10-07T18:00:00.000Z",
    ]);
  });

  it("serviços de 8h ou mais só têm o horário das 10h", () => {
    assert.deepEqual(iso(getAvailableStartTimes(wednesday, 8, [])), ["2026-10-07T13:00:00.000Z"]);
    assert.deepEqual(iso(getAvailableStartTimes(wednesday, 12, [])), ["2026-10-07T13:00:00.000Z"]);
  });

  it("não atende domingo nem segunda", () => {
    assert.deepEqual(getAvailableStartTimes(day(2026, 10, 4), 5, []), []);
    assert.deepEqual(getAvailableStartTimes(day(2026, 10, 5), 5, []), []);
  });

  it("atende de terça a sábado", () => {
    for (const d of [6, 7, 8, 9, 10]) {
      assert.ok(getAvailableStartTimes(day(2026, 10, d), 5, []).length > 0, `dia ${d}`);
    }
  });

  it("remove horários que conflitam com reservas existentes", () => {
    const existing = [
      { scheduledStart: new Date("2026-10-07T13:00:00Z"), scheduledEnd: new Date("2026-10-07T18:00:00Z") },
    ];
    // O atendimento das 10h termina exatamente às 15h: o das 15h continua livre.
    assert.deepEqual(iso(getAvailableStartTimes(wednesday, 5, existing)), ["2026-10-07T18:00:00.000Z"]);
  });

  it("uma reserva longa ocupa o dia inteiro", () => {
    const existing = [
      { scheduledStart: new Date("2026-10-07T13:00:00Z"), scheduledEnd: new Date("2026-10-08T01:00:00Z") },
    ];
    assert.deepEqual(getAvailableStartTimes(wednesday, 5, existing), []);
  });
});

describe("isOfferedStartTime", () => {
  it("aceita os horários fixos da agenda", () => {
    assert.equal(isOfferedStartTime(new Date("2026-10-07T13:00:00Z"), 5), true);
    assert.equal(isOfferedStartTime(new Date("2026-10-07T18:00:00Z"), 5), true);
  });

  it("recusa horários fora da grade", () => {
    assert.equal(isOfferedStartTime(new Date("2026-10-07T14:00:00Z"), 5), false);
    assert.equal(isOfferedStartTime(new Date("2026-10-07T03:00:00Z"), 5), false);
  });

  it("recusa dias fechados", () => {
    assert.equal(isOfferedStartTime(new Date("2026-10-04T13:00:00Z"), 5), false); // domingo
    assert.equal(isOfferedStartTime(new Date("2026-10-05T13:00:00Z"), 5), false); // segunda
  });

  it("recusa o horário das 15h para serviços longos", () => {
    assert.equal(isOfferedStartTime(new Date("2026-10-07T18:00:00Z"), 12), false);
    assert.equal(isOfferedStartTime(new Date("2026-10-07T13:00:00Z"), 12), true);
  });

  it("não depende do fuso do servidor", () => {
    const original = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((tz) => {
        process.env.TZ = tz;
        return isOfferedStartTime(new Date("2026-10-07T13:00:00Z"), 5);
      });
      assert.deepEqual(results, [true, true, true]);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
