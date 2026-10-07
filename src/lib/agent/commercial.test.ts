import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentContext, type AgentContext } from "./context";
import { checkDraft, type ViolationCode } from "./guardrails";
import { LEAD_STAGES, parseToolCall } from "./tools";
import { promotion, unitConfig } from "./testSupport";

// Camada comercial (agente/08-camada-comercial.md): os 20 cenários pedidos.
// O modelo aqui não roda (testes sem rede). O que se garante em código: para cada
// cenário, o rascunho "vendedor demais" que quebraria uma regra é BLOQUEADO e o
// rascunho consultivo esperado PASSA. O jeito de falar do modelo real é medido à
// parte, na avaliação com o Claude no Preview (docs/camada-comercial-auditoria-2026-10-06.md).

function context(withPromotion: boolean): AgentContext {
  return buildAgentContext(
    {
      conversation: {
        id: "c1",
        unitId: "u1",
        customerId: "cu1",
        channel: "WHATSAPP",
        externalId: null,
        mode: "BOT",
        assignedTo: null,
        lastContactAt: null,
      },
      unitId: "u1",
      customerName: "Maria",
      unit: unitConfig("u1"),
      promotions: withPromotion ? [promotion("u1")] : [],
      recentMessages: [],
      outboundMessageCount: 1,
      lastTransition: null,
      activeHandoff: null,
      upcomingConfirmedBooking: null,
      modeAtTrigger: "BOT",
    },
    new Date("2026-10-15T10:00:00-03:00"),
  );
}

type Scenario = {
  name: string;
  /** Rascunho que quebra uma regra e precisa ser barrado (null: o risco não é detectável por texto). */
  bad: { text: string; code: ViolationCode; withPromotion?: boolean } | null;
  /** Rascunho consultivo esperado: precisa passar. */
  good: string;
};

const SCENARIOS: Scenario[] = [
  {
    name: "1. pergunta o preço",
    bad: { text: "A aplicação fica R$ 900.", code: "unauthorized_price" },
    good: "O valor muda conforme comprimento, espessura e material, por isso a Thay olha seu projeto antes de passar, pra não ter surpresa. Pra adiantar, seu cabelo tem pelo menos 4 dedos com a mecha esticada? 💛",
  },
  {
    name: "2. preço sem dizer o serviço",
    bad: { text: "Dread sai em média 1.200 reais.", code: "unauthorized_price" },
    good: "Depende do projeto. Você está pensando em fazer a cabeça toda ou só o topo? 💛",
  },
  {
    name: "3. pronto para comprar",
    bad: { text: "Seu horário está confirmado pra sábado!", code: "booking_claim" },
    good: "Vamos nessa! Pelo que você me contou, esse visual combina bastante com o que você quer. Vou deixar tudo organizado pra Thay te passar o valor e os horários. 💛",
  },
  {
    name: "4. indeciso",
    bad: { text: "Decide logo, corre que a agenda tá lotando!", code: "invented_scarcity" },
    good: "Sem pressa, Maria. Tem alguma coisa que você quer evitar no resultado? Assim eu te ajudo a pensar no estilo.",
  },
  {
    name: "5. acha caro",
    bad: { text: "Consigo um desconto de 10% pra você.", code: "unauthorized_discount" },
    good: "Entendo, Maria. Ficou acima do que você planejou ou você está comparando com outro orçamento? Se quiser, a Thay te explica direitinho o que entra no seu projeto. 💛",
  },
  {
    name: "6. pede desconto",
    bad: { text: "No Pix faço 15% off.", code: "unauthorized_discount" },
    good: "Quem passa os valores é a Thay, junto com o seu orçamento. 💛",
  },
  {
    name: "7. compara com concorrente",
    bad: { text: "Aqui garantimos o resultado, diferente de lá.", code: "unrealistic_promise" },
    good: "Faz sentido pesquisar! Na comparação, vale olhar o material, a técnica e como fica a manutenção depois. Se quiser, eu te explico como a gente faz aqui. 💛",
  },
  {
    name: "8. vou pensar",
    bad: { text: "Pensa rápido que essa condição é só hoje.", code: "invented_scarcity" },
    good: "Claro, fica à vontade. Só pra eu não deixar nada pra trás, ficou alguma dúvida sobre o procedimento, o resultado ou o valor? 💛",
  },
  {
    name: "9. falar depois",
    bad: { text: "São as últimas vagas da semana, melhor decidir agora.", code: "invented_scarcity" },
    good: "Sem problema! Quando quiser continuar, é só me chamar aqui que eu sigo de onde paramos. 💛",
  },
  {
    name: "10. medo de fazer",
    bad: { text: "Garanto o resultado, pode ficar tranquila.", code: "unrealistic_promise" },
    good: "É normal ter esse receio. A Thay olha a foto do seu cabelo antes e escolhe o método pelo seu tipo de fio, e você sai sabendo os cuidados. O que mais te preocupa? 💛",
  },
  {
    name: "11. primeira aplicação",
    bad: { text: "Temos horários amanhã às 10h.", code: "availability_claim" },
    good: "Que bom que você vai começar com a gente! Você já tem uma referência do visual que quer? 💛",
  },
  {
    name: "12. cliente antigo, manutenção",
    bad: { text: "A manutenção fica 300 reais.", code: "unauthorized_price" },
    good: "Oi, Maria! Me manda uma foto de como estão seus dreads hoje? Assim a Thay vê se é só raiz ou completa.",
  },
  {
    name: "13. pergunta de promoção (sem promoção ativa)",
    bad: { text: "A promoção de aniversário vale pra você!", code: "inactive_promotion", withPromotion: false },
    good: "No momento a gente não tem promoção, o valor sai no orçamento da Thay. Me conta o que você quer fazer? 💛",
  },
  {
    name: "13b. promoção ativa, sem urgência inventada",
    bad: { text: "A promoção está acabando, aproveita!", code: "invented_scarcity" },
    good: "Tem a promoção de aniversário, só no topo, com extensão sintética. A Thay confirma pela foto se o seu cabelo se encaixa. Me manda uma foto de como ele está hoje? 💛",
  },
  {
    name: "14. pergunta que o agente não sabe",
    bad: null,
    good: "Essa informação eu prefiro confirmar com a equipe pra não te passar nada errado. Vou encaminhar pra Thay. 💛",
  },
  {
    name: "15. pede para falar com uma pessoa",
    bad: { text: "Não precisa da Thay, eu já reservei seu horário.", code: "booking_claim" },
    good: "Claro, Maria! Já deixei tudo organizado pra Thay continuar seu atendimento. 💛",
  },
  {
    name: "16. manda várias informações de uma vez",
    bad: null,
    good: "Anotei tudo, Maria! Micro, preto e até o ombro. Só falta uma foto de como seu cabelo está hoje, me manda? 💛",
  },
  {
    name: "17. muda de ideia no meio",
    bad: null,
    good: "Sem problema, então fica M em vez de micro. Atualizei aqui pra Thay. 💛",
  },
  {
    name: "18. mensagens curtas e picadas",
    bad: null,
    good: "Entendi, você quer dread até a cintura e já tem a referência. Me manda a foto do seu cabelo hoje? 💛",
  },
  {
    name: "19. pronto para agendar",
    bad: { text: "Pode vir sábado às 10h que está marcado.", code: "booking_claim" },
    good: "Perfeito, Maria! Já deixei tudo organizado pra Thay te passar o valor e os horários. Ela atende de segunda a sexta, das 10h às 21h, e sábado das 10h às 15h. 💛",
  },
  {
    name: "20. abandona antes de fechar",
    bad: { text: "Oi! Última chance, a promoção acaba hoje!", code: "invented_scarcity" },
    good: "Oi, Maria! Você tinha falado sobre fazer micro até o ombro. Conseguiu decidir? Se quiser, te ajudo a definir. 💛",
  },
];

describe("camada comercial: 20 cenários (travas em código)", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      const good = checkDraft(scenario.good, context(true));
      assert.equal(good.ok, true, `o rascunho consultivo deveria passar: ${JSON.stringify(good.violations)}`);
      if (scenario.bad) {
        const bad = checkDraft(scenario.bad.text, context(scenario.bad.withPromotion ?? true));
        assert.equal(bad.ok, false, `deveria bloquear: ${scenario.bad.text}`);
        assert.ok(
          bad.violations.some((violation) => violation.code === scenario.bad?.code),
          `esperava ${scenario.bad.code}: ${JSON.stringify(bad.violations)}`,
        );
      }
    });
  }
});

describe("camada comercial: escassez inventada", () => {
  for (const text of [
    "Últimas vagas!",
    "A agenda está quase cheia.",
    "Tem muita procura esse mês.",
    "Vagas limitadas pra outubro.",
    "Corre pra garantir!",
    "Fecha antes que acabe.",
  ]) {
    it(`bloqueia: ${text}`, () => {
      assert.ok(checkDraft(text, context(true)).violations.some((violation) => violation.code === "invented_scarcity"));
    });
  }

  it("não confunde com frases normais", () => {
    for (const text of ["Só pra eu entender, você já usa dread?", "A Thay atende hoje até as 21h.", "Corremos atrás da referência certa com você."]) {
      assert.equal(
        checkDraft(text, context(true)).violations.some((violation) => violation.code === "invented_scarcity"),
        false,
        text,
      );
    }
  });
});

describe("camada comercial: estágio do cliente", () => {
  it("update_lead_data aceita os 10 estágios e recusa valor fora da lista", () => {
    for (const stage of LEAD_STAGES) {
      assert.equal(parseToolCall({ name: "update_lead_data", arguments: { stage } }).ok, true, stage);
    }
    assert.equal(parseToolCall({ name: "update_lead_data", arguments: { stage: "QUENTISSIMO" } }).ok, false);
  });
});
