import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activePromotions, isPromotionActive, promotionSchema, staticPromotions } from "./promotions";
import { deriveAgentStatus } from "./status";
import { promotion } from "./testSupport";

const sp = (iso: string) => new Date(`${iso}-03:00`);

describe("promoções são dados com período (calendário de São Paulo)", () => {
  const promo = promotion("unit-a", { startsOn: "2026-10-01", endsOn: "2026-10-31" });

  it("vale do primeiro ao último dia, inclusive", () => {
    assert.equal(isPromotionActive(promo, sp("2026-10-01T00:00:00")), true);
    assert.equal(isPromotionActive(promo, sp("2026-10-31T23:59:00")), true);
    assert.equal(isPromotionActive(promo, sp("2026-09-30T23:59:00")), false);
  });

  it("vence na virada do dia em São Paulo, não em UTC", () => {
    // 22h de 31/10 em SP já é 01h de 01/11 em UTC: ainda vale.
    assert.equal(isPromotionActive(promo, new Date("2026-11-01T01:00:00Z")), true);
    // 00h de 01/11 em SP: venceu.
    assert.equal(isPromotionActive(promo, new Date("2026-11-01T03:00:00Z")), false);
    // 23h de 30/09 em SP já é 01/10 em UTC: ainda NÃO começou.
    assert.equal(isPromotionActive(promo, new Date("2026-10-01T02:00:00Z")), false);
  });

  it("dá o mesmo resultado com o servidor em qualquer fuso", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
        process.env.TZ = tz;
        assert.equal(isPromotionActive(promo, new Date("2026-11-01T01:00:00Z")), true, tz);
        assert.equal(isPromotionActive(promo, new Date("2026-11-01T03:00:00Z")), false, tz);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("sem data de início vale até o fim; inativa nunca vale", () => {
    assert.equal(isPromotionActive(promotion("unit-a"), sp("2020-01-01T10:00:00")), true);
    assert.equal(isPromotionActive(promotion("unit-a", { active: false }), sp("2026-10-15T10:00:00")), false);
  });

  it("filtra por unidade e por data", () => {
    const list = [promotion("unit-a"), promotion("unit-b", { id: "promo-b" })];
    assert.deepEqual(activePromotions(list, sp("2026-10-15T10:00:00"), "unit-a").map((p) => p.id), ["promo-teste"]);
    assert.deepEqual(activePromotions(list, sp("2026-11-02T10:00:00"), "unit-a"), []);
  });

  it("o provedor só devolve promoções da unidade pedida", async () => {
    const provider = staticPromotions([promotion("unit-a"), promotion("unit-b", { id: "promo-b" })]);
    assert.deepEqual((await provider.list("unit-b")).map((p) => p.id), ["promo-b"]);
  });

  it("recusa dados malformados (preço, data, regras vazias)", () => {
    assert.throws(() => staticPromotions([promotion("u", { priceBrl: -1 })]));
    assert.throws(() => staticPromotions([promotion("u", { endsOn: "31/10/2026" })]));
    assert.equal(promotionSchema.safeParse(promotion("u", { rules: [] })).success, false);
  });
});

describe("deriveAgentStatus (vocabulário do V2 derivado dos dados)", () => {
  const base = {
    mode: "BOT" as const,
    activeHandoffStatus: null,
    reopenedAfterFinished: false,
    hasUpcomingConfirmedBooking: false,
    outboundMessageCount: 0,
  };

  it("BOT sem nada enviado ainda é 'novo'; depois 'em_atendimento'", () => {
    assert.equal(deriveAgentStatus(base), "novo");
    assert.equal(deriveAgentStatus({ ...base, outboundMessageCount: 3 }), "em_atendimento");
  });

  it("HUMAN: 'aguardando_humano' até alguém assumir, depois 'humano_atendendo'", () => {
    assert.equal(deriveAgentStatus({ ...base, mode: "HUMAN", activeHandoffStatus: "OPEN" }), "aguardando_humano");
    assert.equal(deriveAgentStatus({ ...base, mode: "HUMAN", activeHandoffStatus: "CLAIMED" }), "humano_atendendo");
  });

  it("FINISHED é 'finalizado'; reaberto continua 'finalizado' (não é cliente novo)", () => {
    assert.equal(deriveAgentStatus({ ...base, mode: "FINISHED" }), "finalizado");
    assert.equal(deriveAgentStatus({ ...base, reopenedAfterFinished: true }), "finalizado");
  });

  it("BOT com agendamento confirmado à frente é 'agendamento_confirmado'", () => {
    assert.equal(deriveAgentStatus({ ...base, hasUpcomingConfirmedBooking: true, outboundMessageCount: 2 }), "agendamento_confirmado");
  });
});
