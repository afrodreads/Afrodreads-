import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideLive, isLiveWindowOpen, liveConfigFromEnv, startOfSaoPauloDay, type LiveConfig } from "./live";

// Horário de São Paulo = UTC-3. Datas de outubro de 2026: dia 7 é quarta; dia 11 é domingo.
const at = (day: number, hour: number, minute = 0) => new Date(Date.UTC(2026, 9, day, hour + 3, minute));

const night: LiveConfig = { ...liveConfigFromEnv({ AGENT_LIVE_MODE: "night" }) };
const base = { isTest: false, conversationMode: null, repliesToday: 0, contactRepliesToday: 0 } as const;

describe("piloto: janela de horário", () => {
  it("abre às 21h30, fecha às 9h30 (cruza a meia-noite)", () => {
    assert.equal(isLiveWindowOpen(night, at(7, 21, 29)), false);
    assert.equal(isLiveWindowOpen(night, at(7, 21, 30)), true);
    assert.equal(isLiveWindowOpen(night, at(7, 23, 59)), true);
    assert.equal(isLiveWindowOpen(night, at(8, 0, 0)), true);
    assert.equal(isLiveWindowOpen(night, at(8, 9, 29)), true);
    assert.equal(isLiveWindowOpen(night, at(8, 9, 30)), false);
    assert.equal(isLiveWindowOpen(night, at(8, 14, 0)), false);
  });

  it("domingo o dia inteiro, e feriado configurado", () => {
    assert.equal(isLiveWindowOpen(night, at(11, 14, 0)), true);
    assert.equal(isLiveWindowOpen({ ...night, sundays: false }, at(11, 14, 0)), false);
    const withHoliday = liveConfigFromEnv({ AGENT_LIVE_MODE: "night", AGENT_LIVE_HOLIDAYS: "2026-10-12, lixo" });
    assert.equal(isLiveWindowOpen(withHoliday, at(12, 15, 0)), true);
    assert.equal(withHoliday.holidays.size, 1);
  });

  it("desligado, a janela nunca abre", () => {
    assert.equal(isLiveWindowOpen(liveConfigFromEnv({}), at(11, 23, 0)), false);
  });

  it("valor estranho em AGENT_LIVE_MODE deixa desligado", () => {
    for (const value of ["", "on", "true", "NIGHT", "all"]) {
      assert.equal(liveConfigFromEnv({ AGENT_LIVE_MODE: value }).mode, "off", value);
    }
  });

  it("janela configurável por AGENT_LIVE_WINDOW; formato inválido volta ao padrão", () => {
    const custom = liveConfigFromEnv({ AGENT_LIVE_MODE: "night", AGENT_LIVE_WINDOW: "22:00-08:00" });
    assert.equal(isLiveWindowOpen(custom, at(7, 21, 45)), false);
    assert.equal(isLiveWindowOpen(custom, at(7, 22, 0)), true);
    const invalid = liveConfigFromEnv({ AGENT_LIVE_MODE: "night", AGENT_LIVE_WINDOW: "noite" });
    assert.equal(invalid.startMinute, 21 * 60 + 30);
  });

  it("início do dia em São Paulo", () => {
    assert.equal(startOfSaoPauloDay(at(7, 1, 0)).toISOString(), "2026-10-07T03:00:00.000Z");
    assert.equal(startOfSaoPauloDay(at(7, 23, 59)).toISOString(), "2026-10-07T03:00:00.000Z");
  });
});

describe("piloto: quem atende", () => {
  it("contato de teste: sempre o agente, mesmo com o piloto desligado", () => {
    const decision = decideLive(liveConfigFromEnv({}), at(7, 14, 0), { ...base, isTest: true });
    assert.deepEqual(decision, { agente: true, silent: false, reason: "test" });
  });

  it("piloto desligado: lead real fica com o robô antigo", () => {
    assert.equal(decideLive(liveConfigFromEnv({}), at(7, 23, 0), base).agente, false);
  });

  it("lead novo: agente só dentro da janela", () => {
    assert.equal(decideLive(night, at(7, 23, 0), base).agente, true);
    assert.equal(decideLive(night, at(7, 23, 0), base).reason, "window");
    const day = decideLive(night, at(7, 15, 0), base);
    assert.deepEqual(day, { agente: false, silent: false, reason: "closed" });
  });

  it("conversa que o agente já tem (BOT ou HUMAN) continua depois da janela", () => {
    assert.equal(decideLive(night, at(7, 15, 0), { ...base, conversationMode: "BOT" }).agente, true);
    assert.equal(decideLive(night, at(7, 15, 0), { ...base, conversationMode: "HUMAN" }).reason, "active_conversation");
  });

  it("conversa finalizada conta como lead novo (só dentro da janela)", () => {
    assert.equal(decideLive(night, at(7, 15, 0), { ...base, conversationMode: "FINISHED" }).agente, false);
  });

  it("limite diário geral devolve o lead ao robô antigo, mesmo em conversa ativa", () => {
    const decision = decideLive(night, at(7, 23, 0), { ...base, conversationMode: "BOT", repliesToday: night.maxRepliesPerDay });
    assert.deepEqual(decision, { agente: false, silent: false, reason: "daily_cap" });
  });

  it("limite diário do contato: o agente continua dono da conversa, mas fica em silêncio", () => {
    const decision = decideLive(night, at(7, 23, 0), { ...base, contactRepliesToday: night.maxRepliesPerContactPerDay });
    assert.deepEqual(decision, { agente: true, silent: true, reason: "contact_cap" });
  });
});
