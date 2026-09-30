import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activePromotions, isPromotionActive, promotionSchema, staticPromotions } from "./promotions";
import { deriveAgentStatus } from "./status";
import { birthdayPromotion } from "./testSupport";

const sp = (iso: string) => new Date(`${iso}-03:00`);

describe("promoções são dados com validade (calendário de São Paulo)", () => {
  it("ativa durante todo o último dia de validade", () => {
    assert.equal(isPromotionActive(birthdayPromotion, sp("2026-10-31T23:59:00")), true);
    assert.equal(isPromotionActive(birthdayPromotion, sp("2026-10-01T00:00:00")), true);
  });

  it("vence na virada do dia em São Paulo, não em UTC", () => {
    // 22h de 31/10 em SP já é 01h de 01/11 em UTC: ainda vale.
    assert.equal(isPromotionActive(birthdayPromotion, new Date("2026-11-01T01:00:00Z")), true);
    // 00h de 01/11 em SP: venceu.
    assert.equal(isPromotionActive(birthdayPromotion, new Date("2026-11-01T03:00:00Z")), false);
  });

  it("filtra as vencidas", () => {
    assert.deepEqual(activePromotions([birthdayPromotion], sp("2026-11-02T10:00:00")), []);
    assert.equal(activePromotions([birthdayPromotion], sp("2026-10-15T10:00:00")).length, 1);
  });

  it("recusa dados malformados (preço, data)", async () => {
    assert.throws(() => staticPromotions([{ ...birthdayPromotion, priceBrl: -1 }]));
    assert.throws(() => staticPromotions([{ ...birthdayPromotion, validUntil: "31/10/2026" }]));
    assert.equal(promotionSchema.safeParse({ ...birthdayPromotion, criteria: [] }).success, false);
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

  it("FINISHED é 'finalizado'", () => {
    assert.equal(deriveAgentStatus({ ...base, mode: "FINISHED" }), "finalizado");
  });

  it("cliente que voltou depois de finalizado (reaberto) continua 'finalizado': não é cliente novo", () => {
    assert.equal(deriveAgentStatus({ ...base, reopenedAfterFinished: true, outboundMessageCount: 0 }), "finalizado");
  });

  it("BOT com agendamento confirmado à frente é 'agendamento_confirmado'", () => {
    assert.equal(deriveAgentStatus({ ...base, hasUpcomingConfirmedBooking: true, outboundMessageCount: 2 }), "agendamento_confirmado");
  });
});
