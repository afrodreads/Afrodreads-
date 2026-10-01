import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSaoPauloParts,
  parseDateKey,
  saoPauloCalendarDaysBetween,
  saoPauloDateKey,
  saoPauloDayAsUtcMidnight,
  startOfSaoPauloDay,
  zonedTimeToUtc,
} from "./timezone";

describe("getSaoPauloParts", () => {
  it("converte UTC para o horário de parede de São Paulo (UTC-3)", () => {
    const p = getSaoPauloParts(new Date("2026-10-01T02:30:00Z"));
    assert.deepEqual(p, { year: 2026, month: 9, day: 30, hour: 23, minute: 30, weekday: 3 });
  });

  it("meia-noite de SP é hora 0, nunca 24", () => {
    const p = getSaoPauloParts(new Date("2026-10-01T03:00:00Z"));
    assert.equal(p.hour, 0);
    assert.equal(p.day, 1);
  });
});

describe("zonedTimeToUtc", () => {
  it("10h em São Paulo são 13h UTC", () => {
    assert.equal(zonedTimeToUtc({ year: 2026, month: 10, day: 7, hour: 10 }).toISOString(), "2026-10-07T13:00:00.000Z");
  });

  it("15h em São Paulo são 18h UTC", () => {
    assert.equal(zonedTimeToUtc({ year: 2026, month: 10, day: 7, hour: 15 }).toISOString(), "2026-10-07T18:00:00.000Z");
  });

  it("vira o dia corretamente", () => {
    assert.equal(zonedTimeToUtc({ year: 2026, month: 12, day: 31, hour: 23 }).toISOString(), "2027-01-01T02:00:00.000Z");
  });
});

describe("startOfSaoPauloDay", () => {
  it("às 23h30 de SP (já dia seguinte em UTC) o 'hoje' ainda é o dia de SP", () => {
    assert.equal(startOfSaoPauloDay(new Date("2026-10-01T02:30:00Z")).toISOString(), "2026-09-30T03:00:00.000Z");
  });
});

describe("saoPauloCalendarDaysBetween", () => {
  it("conta dias de calendário de SP, não de UTC", () => {
    // 23h de SP do dia 8 já é dia 9 em UTC: em UTC daria 1 dia, em SP são 2.
    const cancelled = new Date("2026-06-08T23:00:00-03:00");
    const appointment = new Date("2026-06-10T10:00:00-03:00");
    assert.equal(cancelled.toISOString(), "2026-06-09T02:00:00.000Z");
    assert.equal(saoPauloCalendarDaysBetween(cancelled, appointment), 2);
  });

  it("é negativo quando o segundo instante é anterior", () => {
    assert.equal(saoPauloCalendarDaysBetween(new Date("2026-06-10T13:00:00Z"), new Date("2026-06-08T13:00:00Z")), -2);
  });
});

describe("chaves de data", () => {
  it("saoPauloDateKey usa o dia de SP", () => {
    assert.equal(saoPauloDateKey(new Date("2026-10-01T02:30:00Z")), "2026-09-30");
  });

  it("saoPauloDayAsUtcMidnight devolve a meia-noite UTC do dia de SP", () => {
    assert.equal(saoPauloDayAsUtcMidnight(new Date("2026-10-01T02:30:00Z")).toISOString(), "2026-09-30T00:00:00.000Z");
  });

  it("parseDateKey aceita datas reais e recusa o resto", () => {
    assert.equal(parseDateKey("2026-10-07")?.toISOString(), "2026-10-07T00:00:00.000Z");
    assert.equal(parseDateKey("2026-02-30"), null);
    assert.equal(parseDateKey("07/10/2026"), null);
    assert.equal(parseDateKey("abc"), null);
    assert.equal(parseDateKey(""), null);
  });
});

describe("independência do fuso do servidor", () => {
  it("o resultado é o mesmo com o servidor em UTC, Tóquio ou Los Angeles", () => {
    const original = process.env.TZ;
    const instant = new Date("2026-10-01T02:30:00Z");
    try {
      const results = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((tz) => {
        process.env.TZ = tz;
        return JSON.stringify({
          parts: getSaoPauloParts(instant),
          start: startOfSaoPauloDay(instant).toISOString(),
          key: saoPauloDateKey(instant),
          slot: zonedTimeToUtc({ year: 2026, month: 10, day: 7, hour: 10 }).toISOString(),
        });
      });
      assert.equal(new Set(results).size, 1);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
