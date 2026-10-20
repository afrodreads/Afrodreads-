import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  adminDayColor,
  assignChairs,
  checkAdd,
  freeCells,
  PERIODS,
  PRIOR_BOOKING_SLUG,
  remainingFor,
  serviceDayColor,
  type DayBooking,
  type Period,
} from "./engine";
import { capacityDefaultsSql, DEFAULT_RULES } from "./defaults";
import { defaultRuleBook } from "./ruleBook";

// Regras de capacidade (especificação de 18/10/2026). Os ids aqui são os slugs.
const book = defaultRuleBook();

const MC = "manutencao-completa";
const MT = "manutencao-topo";
const AC = "cabeca-toda";
const ML = "microlocs";
const AT = "primeira-aplicacao-topo";
const RT = "retwist";
const RTT = "retwist-mais-twist";
const SL = "retwist-twist"; // "Start Locs"
const RV = "revitalizacao";
const PT = "penteados";
const SD = "short-dread";
const CA = "cultivo-agulhado";
const ALL = [MC, MT, AC, ML, AT, RT, RTT, SL, RV, PT, SD, CA];

let seq = 0;
const at = (serviceId: string, period: Period, forced = false): DayBooking => ({ id: `b${++seq}`, serviceId, period, forced });

/** Monta o dia na ordem dada, exigindo que cada passo seja aceito. */
function day(...steps: [string, Period][]): DayBooking[] {
  const bookings: DayBooking[] = [];
  for (const [serviceId, period] of steps) {
    const result = checkAdd(book, bookings, serviceId, period);
    assert.ok(result.ok, `${serviceId} ${period} deveria caber em [${bookings.map((b) => `${b.serviceId}@${b.period}`).join(", ")}]: ${!result.ok && result.reason}`);
    bookings.push(at(serviceId, period));
  }
  return bookings;
}

const fits = (existing: DayBooking[], serviceId: string, period: Period) => checkAdd(book, existing, serviceId, period).ok;

/** Existe algum jeito de A e B estarem no mesmo dia? */
function canShareDay(a: string, b: string): boolean {
  for (const pa of PERIODS) {
    if (!fits([], a, pa)) continue;
    for (const pb of PERIODS) if (fits([at(a, pa)], b, pb)) return true;
  }
  return false;
}

// Matriz escrita à mão a partir da especificação. "?" (PENDENTE) fica bloqueado
// para o cliente e só entra por encaixe manual no painel.
const ALLOWED_PAIRS = new Set(
  [
    [MC, MC], [MC, MT], [MC, PT], [MC, RT], [MC, RTT], [MC, SL],
    [MT, MT], [MT, AC], [MT, ML], [MT, AT], [MT, RT], [MT, RTT], [MT, SL], [MT, PT],
    [ML, AT],
    [AT, RT], [AT, RTT], [AT, SL],
    [RV, PT],
  ].map(([a, b]) => [a, b].sort().join("+")),
);

describe("matriz de combinações (todo par de serviços no mesmo dia)", () => {
  for (let i = 0; i < ALL.length; i++) {
    for (let j = i; j < ALL.length; j++) {
      const [a, b] = [ALL[i], ALL[j]];
      const expected = ALLOWED_PAIRS.has([a, b].sort().join("+"));
      it(`${a} + ${b}: ${expected ? "permitido" : "proibido"}`, () => {
        assert.equal(canShareDay(a, b), expected);
        assert.equal(canShareDay(b, a), expected, "a ordem dos agendamentos não pode mudar a resposta");
      });
    }
  }
});

describe("manutenção completa", () => {
  it("ocupa as 2 cadeiras em 1 período: nada de 1 cadeira cabe junto (exceto retwist da Thay)", () => {
    const d = day([MC, "MORNING"]);
    for (const other of [MT, PT]) assert.equal(fits(d, other, "MORNING"), false, other);
  });

  it("no outro período: outra manutenção completa", () => {
    const d = day([MC, "MORNING"], [MC, "AFTERNOON"]);
    assert.equal(fits(d, MC, "MORNING"), false);
  });

  it("no outro período: até 2 manutenções no topo", () => {
    const d = day([MC, "MORNING"], [MT, "AFTERNOON"], [MT, "AFTERNOON"]);
    assert.equal(fits(d, MT, "AFTERNOON"), false);
  });

  it("no outro período: 1 penteado + 1 manutenção no topo (não 2 penteados)", () => {
    const d = day([MC, "MORNING"], [PT, "AFTERNOON"], [MT, "AFTERNOON"]);
    assert.equal(fits(d, MT, "AFTERNOON"), false);
    assert.equal(fits(day([MC, "MORNING"], [PT, "AFTERNOON"]), PT, "AFTERNOON"), false);
  });

  it("no mesmo período de um retwist, retwist + twist ou start locks da Thay", () => {
    for (const thay of [RT, RTT, SL]) {
      day([MC, "MORNING"], [thay, "MORNING"]);
      day([thay, "AFTERNOON"], [MC, "AFTERNOON"]);
    }
  });

  it("com retwist no mesmo período não sobra cadeira para mais ninguém naquele período", () => {
    const d = day([MC, "MORNING"], [RT, "MORNING"]);
    assert.equal(fits(d, MT, "MORNING"), false);
    assert.equal(fits(d, SL, "MORNING"), false);
    day([MC, "MORNING"], [RT, "MORNING"], [MT, "AFTERNOON"], [MT, "AFTERNOON"]);
  });
});

describe("aplicação cabeça toda", () => {
  it("ocupa as 2 cadeiras e no outro período entram até 2 manutenções no topo", () => {
    const d = day([AC, "MORNING"], [MT, "AFTERNOON"], [MT, "AFTERNOON"]);
    assert.equal(fits(d, MT, "AFTERNOON"), false);
  });

  it("4 a 8 h: só começa de manhã", () => {
    assert.equal(checkAdd(book, [], AC, "AFTERNOON").ok, false);
  });

  it("PENDENTE: penteado no lugar de uma manutenção no topo fica bloqueado até confirmar", () => {
    assert.equal(fits(day([AC, "MORNING"]), PT, "AFTERNOON"), false);
  });
});

describe("microlocs", () => {
  it("a Thay fica o dia inteiro; a outra cadeira aceita aplicação ou manutenção no topo, 1 por período", () => {
    const d = day([ML, "MORNING"], [AT, "MORNING"], [MT, "AFTERNOON"]);
    assert.equal(fits(d, MT, "MORNING"), false);
    assert.equal(fits(d, MT, "AFTERNOON"), false);
  });

  it("nada que precise da Thay ou das 2 cadeiras cabe no dia", () => {
    const d = day([ML, "MORNING"]);
    for (const other of [MC, AC, RT, RTT, SL, ML, RV, PT]) {
      for (const period of PERIODS) assert.equal(fits(d, other, period), false, `${other} ${period}`);
    }
  });

  it("começa só de manhã", () => {
    assert.equal(checkAdd(book, [], ML, "AFTERNOON").ok, false);
  });
});

describe("aplicação e manutenção no topo", () => {
  it("manutenção no topo: até 2 por período e 4 por dia", () => {
    const d = day([MT, "MORNING"], [MT, "MORNING"], [MT, "AFTERNOON"], [MT, "AFTERNOON"]);
    assert.equal(fits(d, MT, "MORNING"), false);
    assert.equal(checkAdd(book, day([MT, "MORNING"], [MT, "MORNING"]), MT, "MORNING").ok, false);
  });

  it("aplicação no topo divide o período com retwist (cada um numa cadeira)", () => {
    day([AT, "MORNING"], [RT, "MORNING"]);
    day([RT, "MORNING"], [AT, "MORNING"]);
  });
});

describe("retwist, retwist + twist e start locks (só Thay)", () => {
  it("limite de 1 por período, mesmo entre eles", () => {
    assert.equal(fits(day([RT, "MORNING"]), RT, "MORNING"), false);
    assert.equal(fits(day([RT, "MORNING"]), SL, "MORNING"), false);
  });

  it("companhia permitida: manutenção no topo, manutenção completa e aplicação no topo", () => {
    day([RT, "MORNING"], [MT, "MORNING"], [AT, "AFTERNOON"]);
  });

  it("a cadeira é sempre a da Thay", () => {
    const assignment = assignChairs(book, day([SL, "AFTERNOON"]));
    assert.deepEqual([...assignment!.values()][0], ["THAY"]);
  });
});

describe("revitalização e penteado", () => {
  it("revitalização: 1 cadeira, no máximo 1 por período, começa de manhã", () => {
    assert.equal(fits(day([RV, "MORNING"]), RV, "MORNING"), false);
    assert.equal(checkAdd(book, [], RV, "AFTERNOON").ok, false);
  });

  it("penteado: no máximo 1 por dia, de manhã ou à tarde, divide o dia com revitalização", () => {
    day([PT, "AFTERNOON"]);
    day([RV, "MORNING"], [PT, "MORNING"]);
    assert.equal(fits(day([PT, "MORNING"]), PT, "AFTERNOON"), false);
  });
});

describe("serviços sem regra na especificação (PENDENTE)", () => {
  it("regra provisória conservadora: ocupa o estúdio no período e não divide o dia", () => {
    for (const service of [SD, CA]) {
      const d = day([service, "MORNING"]);
      for (const other of ALL) for (const period of PERIODS) assert.equal(fits(d, other, period), false, `${service} + ${other}`);
    }
  });
});

describe("encaixe forçado e serviços desativados", () => {
  it("um encaixe acima da capacidade lota o dia: nada mais cabe", () => {
    const overbooked = [at(MC, "MORNING", true), at(AC, "MORNING", true)];
    assert.equal(assignChairs(book, overbooked), null);
    for (const service of ALL) assert.equal(fits(overbooked, service, "AFTERNOON"), false, service);
    assert.equal(freeCells(book, overbooked), 0);
  });

  it("serviço desativado não cabe em lugar nenhum", () => {
    const disabled = new Map(book);
    disabled.set(MT, { ...book.get(MT)!, active: false });
    assert.deepEqual(checkAdd(disabled, [], MT, "MORNING"), { ok: false, reason: "inactive_service" });
  });

  it("serviço sem regra cadastrada é recusado", () => {
    assert.deepEqual(checkAdd(book, [], "nao-existe", "MORNING"), { ok: false, reason: "unknown_service" });
  });
});

describe("vagas restantes e cores do calendário", () => {
  it("cliente: a cor considera o serviço escolhido", () => {
    const d = day([MC, "MORNING"]);
    assert.equal(remainingFor(book, d, MC), 1);
    assert.equal(serviceDayColor(remainingFor(book, d, MC)), "yellow");
    assert.equal(remainingFor(book, d, MT), 2);
    assert.equal(serviceDayColor(remainingFor(book, d, MT)), "green");
    const full = day([MC, "MORNING"], [MC, "AFTERNOON"]);
    assert.equal(serviceDayColor(remainingFor(book, full, MC)), "red");
  });

  it("dia vazio: verde para todos os serviços que cabem 2 ou mais vezes", () => {
    assert.equal(remainingFor(book, [], MT), 4);
    assert.equal(remainingFor(book, [], MC), 2);
    assert.equal(remainingFor(book, [], ML), 1); // microlocs: 1 por dia
    assert.equal(remainingFor(book, [], PT), 1); // penteado: 1 por dia
  });

  it("só os períodos abertos contam (ex.: manhã de hoje já passou)", () => {
    assert.equal(remainingFor(book, [], MC, ["AFTERNOON"]), 1);
    assert.equal(remainingFor(book, [], AC, ["AFTERNOON"]), 0);
  });

  it("painel: verde mesmo com 1 agendamento, amarelo com 1 cadeira-período livre, vermelho quando nada cabe", () => {
    assert.equal(adminDayColor(book, []), "green");
    assert.equal(adminDayColor(book, day([MC, "MORNING"])), "green");
    assert.equal(adminDayColor(book, day([MC, "MORNING"], [MT, "AFTERNOON"])), "yellow");
    assert.equal(adminDayColor(book, day([AC, "MORNING"], [MT, "AFTERNOON"], [MT, "AFTERNOON"])), "red");
  });
});

describe("carga inicial = migration", () => {
  it("a migration grava exatamente as regras deste arquivo", () => {
    const root = path.resolve(__dirname, "..", "..", "..");
    const dir = path.join(root, "prisma", "migrations");
    const name = readdirSync(dir).find((entry) => entry.endsWith("_agenda_capacidade_e_pagamento"));
    assert.ok(name, "migration da agenda não encontrada");
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(sql.includes(capacityDefaultsSql()));
  });

  it("toda regra padrão tem limites válidos", () => {
    for (const rule of DEFAULT_RULES) {
      assert.ok(rule.startsMorning || rule.startsAfternoon, rule.slug);
      for (const limit of [rule.maxPerPeriod, rule.maxPerDay]) assert.ok(limit === null || limit >= 1, rule.slug);
    }
  });
});

describe("período já ocupado antes da agenda online (reserva-anterior)", () => {
  // Serviço interno e inativo: ocupa as duas cadeiras do período e não restringe o outro período.
  const withPrior = new Map(book).set(PRIOR_BOOKING_SLUG, {
    id: PRIOR_BOOKING_SLUG,
    slug: PRIOR_BOOKING_SLUG,
    name: "Reserva anterior ao sistema",
    active: false,
    chairs: 2,
    staff: "ANY",
    fullDay: false,
    maxPerPeriod: 1,
    maxPerDay: 1,
    startsMorning: true,
    startsAfternoon: true,
    companions: new Map(),
  });
  const tardeOcupada: DayBooking[] = [{ id: "anterior", serviceId: PRIOR_BOOKING_SLUG, period: "AFTERNOON" }]; // quarta 04/11/2026
  const manhaOcupada: DayBooking[] = [{ id: "anterior", serviceId: PRIOR_BOOKING_SLUG, period: "MORNING" }]; // sábado 21/11/2026

  it("tarde ocupada: ninguém entra à tarde, a manhã segue livre para todos os serviços ativos", () => {
    for (const rule of DEFAULT_RULES) {
      assert.equal(checkAdd(withPrior, tardeOcupada, rule.slug, "AFTERNOON").ok, false, `${rule.slug} à tarde`);
    }
    assert.equal(checkAdd(withPrior, tardeOcupada, MC, "MORNING").ok, true);
    assert.equal(checkAdd(withPrior, tardeOcupada, RT, "MORNING").ok, true);
    assert.equal(checkAdd(withPrior, tardeOcupada, PT, "MORNING").ok, true);
  });

  it("manhã ocupada: ninguém entra de manhã, a tarde segue livre", () => {
    for (const rule of DEFAULT_RULES) {
      assert.equal(checkAdd(withPrior, manhaOcupada, rule.slug, "MORNING").ok, false, `${rule.slug} de manhã`);
    }
    assert.equal(checkAdd(withPrior, manhaOcupada, MC, "AFTERNOON").ok, true);
    assert.equal(checkAdd(withPrior, manhaOcupada, MT, "AFTERNOON").ok, true);
  });

  it("o outro período continua obedecendo as regras de cada serviço", () => {
    // Manutenção completa de manhã + outra manutenção completa de manhã (2 cadeiras) já não cabe.
    const comUmaManha = [...tardeOcupada, { id: "x", serviceId: MC, period: "MORNING" as const }];
    assert.equal(checkAdd(withPrior, comUmaManha, MC, "MORNING").ok, false);
    assert.equal(checkAdd(withPrior, comUmaManha, MC, "AFTERNOON").ok, false);
  });

  it("calendário: o dia continua com vaga no outro período (não fica vermelho)", () => {
    assert.equal(remainingFor(withPrior, tardeOcupada, MC), 1);
    assert.notEqual(serviceDayColor(remainingFor(withPrior, tardeOcupada, MC)), "red");
    assert.notEqual(adminDayColor(withPrior, tardeOcupada), "red");
  });
});
