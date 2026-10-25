import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminMonth, clientMonth, monthDays, type MonthData } from "./calendar";
import { defaultRuleBook } from "./ruleBook";
import type { DayBooking } from "./engine";

const book = defaultRuleBook();
// "Agora": 30/11/2026 (segunda), 12h em São Paulo.
const NOW = new Date("2026-11-30T15:00:00Z");
const december = monthDays("2026-12")!;

const data = (bookings: Record<string, DayBooking[]> = {}, blocked: string[] = []): MonthData => ({
  book,
  bookingsByDay: new Map(Object.entries(bookings)),
  blockedDays: new Set(blocked),
  now: NOW,
});
const find = <T extends { date: string }>(days: T[], date: string): T => days.find((day) => day.date === date)!;

describe("calendário do mês", () => {
  it("monta os dias do mês e recusa mês inválido", () => {
    assert.equal(december.length, 31);
    assert.equal(monthDays("2026-13"), null);
    assert.equal(monthDays("dezembro"), null);
  });

  it("cliente: fechado (domingo/segunda), bloqueado e cor pelo serviço escolhido", () => {
    const bookings = { "2026-12-02": [{ id: "x", serviceId: "manutencao-completa", period: "MORNING" as const }] };
    const days = clientMonth(december, "manutencao-completa", data(bookings, ["2026-12-03"]));
    assert.equal(find(days, "2026-12-06").status, "closed"); // domingo
    assert.equal(find(days, "2026-12-07").status, "closed"); // segunda
    assert.equal(find(days, "2026-12-03").status, "blocked");
    assert.deepEqual(find(days, "2026-12-01"), { date: "2026-12-01", status: "green", remaining: 2 });
    assert.deepEqual(find(days, "2026-12-02"), { date: "2026-12-02", status: "yellow", remaining: 1 });

    const topo = clientMonth(december, "manutencao-topo", data(bookings));
    assert.deepEqual(find(topo, "2026-12-02"), { date: "2026-12-02", status: "yellow", remaining: 2 }); // já tem cliente; ainda cabem 2 à tarde
  });

  it("cliente: sem ninguém marcado o dia é verde, mesmo que o serviço só caiba 1 por dia", () => {
    // Microlocs ocupa o dia inteiro: cabe 1 por dia, e em dia vazio isso não é "última vaga".
    const days = clientMonth(december, "microlocs", data());
    assert.deepEqual(find(days, "2026-12-01"), { date: "2026-12-01", status: "green", remaining: 1 });
    for (const day of days) assert.notEqual(day.status, "yellow", day.date);
  });

  it("cliente: amarelo só quando já tem cliente marcado e ainda cabe; vermelho quando não cabe", () => {
    const comCliente = { "2026-12-01": [{ id: "a", serviceId: "manutencao-completa", period: "MORNING" as const }] };
    assert.equal(find(clientMonth(december, "manutencao-completa", data(comCliente)), "2026-12-01").status, "yellow");
    // Microlocs (dia inteiro) não cabe com cliente na manhã: vermelho, não amarelo.
    assert.equal(find(clientMonth(december, "microlocs", data(comCliente)), "2026-12-01").status, "red");
    // Outros dias, sem cliente: verde.
    assert.equal(find(clientMonth(december, "manutencao-completa", data(comCliente)), "2026-12-08").status, "green");
  });

  it("cliente: dia lotado para o serviço fica vermelho", () => {
    const full = {
      "2026-12-04": [
        { id: "a", serviceId: "manutencao-completa", period: "MORNING" as const },
        { id: "b", serviceId: "manutencao-completa", period: "AFTERNOON" as const },
      ],
    };
    assert.equal(find(clientMonth(december, "manutencao-completa", data(full)), "2026-12-04").status, "red");
  });

  it("painel: o dia como um todo", () => {
    const bookings = {
      "2026-12-01": [{ id: "a", serviceId: "manutencao-completa", period: "MORNING" as const }],
      "2026-12-02": [
        { id: "b", serviceId: "cabeca-toda", period: "MORNING" as const },
        { id: "c", serviceId: "manutencao-topo", period: "AFTERNOON" as const },
        { id: "d", serviceId: "manutencao-topo", period: "AFTERNOON" as const },
      ],
    };
    const days = adminMonth(december, data(bookings));
    assert.deepEqual(find(days, "2026-12-01"), { date: "2026-12-01", status: "green", freeCells: 2 });
    assert.deepEqual(find(days, "2026-12-02"), { date: "2026-12-02", status: "red", freeCells: 0 });
    assert.equal(find(days, "2026-12-09").status, "green");
  });

  it("dias que já passaram ficam indisponíveis", () => {
    const november = monthDays("2026-11")!;
    const days = clientMonth(november, "manutencao-topo", data());
    assert.equal(find(days, "2026-11-28").status, "past"); // sábado passado
  });
});
