import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bookingPeriod, isOpenWeekday, offeredPeriod, openPeriods, periodOfStart, periodStart } from "./schedule";

// Dia de calendário consultado = meia-noite UTC (formato da API de agenda).
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("grade da agenda", () => {
  const wednesday = day(2026, 10, 7);

  it("manhã às 10h e tarde às 15h de São Paulo (13h e 18h UTC)", () => {
    assert.equal(periodStart(wednesday, "MORNING").toISOString(), "2026-10-07T13:00:00.000Z");
    assert.equal(periodStart(wednesday, "AFTERNOON").toISOString(), "2026-10-07T18:00:00.000Z");
  });

  it("atende de terça a sábado; fecha domingo e segunda", () => {
    for (const d of [6, 7, 8, 9, 10]) assert.equal(isOpenWeekday(day(2026, 10, d)), true, `dia ${d}`);
    assert.equal(isOpenWeekday(day(2026, 10, 4)), false);
    assert.equal(isOpenWeekday(day(2026, 10, 5)), false);
  });

  it("reconhece o período de um horário de início e recusa horários fora da grade", () => {
    assert.equal(periodOfStart(new Date("2026-10-07T13:00:00Z")), "MORNING");
    assert.equal(periodOfStart(new Date("2026-10-07T18:00:00Z")), "AFTERNOON");
    assert.equal(periodOfStart(new Date("2026-10-07T14:00:00Z")), null);
  });

  it("horário oferecido = dia aberto + 10h ou 15h", () => {
    assert.equal(offeredPeriod(new Date("2026-10-07T13:00:00Z")), "MORNING");
    assert.equal(offeredPeriod(new Date("2026-10-04T13:00:00Z")), null); // domingo
    assert.equal(offeredPeriod(new Date("2026-10-07T03:00:00Z")), null);
  });

  it("só oferece períodos que ainda não começaram", () => {
    assert.deepEqual(openPeriods(wednesday, new Date("2026-10-06T12:00:00Z")), ["MORNING", "AFTERNOON"]);
    assert.deepEqual(openPeriods(wednesday, new Date("2026-10-07T14:00:00Z")), ["AFTERNOON"]);
    assert.deepEqual(openPeriods(wednesday, new Date("2026-10-07T19:00:00Z")), []);
    assert.deepEqual(openPeriods(day(2026, 10, 5), new Date("2026-10-01T12:00:00Z")), []);
  });

  it("agendamentos antigos sem período gravado: período pelo horário", () => {
    assert.equal(bookingPeriod({ period: null, scheduledStart: new Date("2026-10-07T18:00:00Z") }), "AFTERNOON");
    assert.equal(bookingPeriod({ period: "MORNING", scheduledStart: new Date("2026-10-07T18:00:00Z") }), "MORNING");
  });

  it("não depende do fuso do servidor", () => {
    const original = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((tz) => {
        process.env.TZ = tz;
        return offeredPeriod(new Date("2026-10-07T13:00:00Z"));
      });
      assert.deepEqual(results, ["MORNING", "MORNING", "MORNING"]);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
