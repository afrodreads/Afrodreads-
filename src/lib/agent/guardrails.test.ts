import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentContext, type AgentContext } from "./context";
import { checkDraft, type ViolationCode } from "./guardrails";
import { birthdayPromotion, unitConfig } from "./testSupport";

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
      customerName: "Maria",
      unit: unitConfig("u1"),
      promotions: withPromotion ? [birthdayPromotion] : [],
      recentMessages: [],
      outboundMessageCount: 1,
      lastTransition: null,
      activeHandoff: null,
      upcomingConfirmedBooking: null,
    },
    new Date("2026-10-15T10:00:00-03:00"),
  );
}

const codes = (text: string, withPromotion = true): ViolationCode[] =>
  checkDraft(text, context(withPromotion)).violations.map((violation) => violation.code);

const blocked = (text: string, expected: ViolationCode, withPromotion = true) => {
  const result = checkDraft(text, context(withPromotion));
  assert.equal(result.ok, false, `deveria bloquear: ${text}`);
  assert.ok(result.violations.some((v) => v.code === expected), `esperava ${expected} em: ${text} → ${codes(text, withPromotion)}`);
};

describe("guardrails: mensagens normais do V2 passam", () => {
  for (const text of [
    "Olá! É um prazer receber você por aqui 💛 Sou a atendente virtual da Afro Dreads. Estamos em Pirituba/SP.",
    "Recebi, obrigada! 💛",
    "A gente não trabalha com um valor único porque cada projeto muda. Me manda uma foto do seu cabelo que eu deixo tudo organizado para a Thay avaliar. 💛",
    "O sinal é de R$ 50 e é descontado do valor final. Se cancelar com 2 dias ou mais, ele é devolvido.",
    "Em dezembro o sinal é 50% do serviço.",
    "Perfeito, Maria! Já deixei tudo organizado para a Thay continuar seu atendimento. Ela atende de segunda a sexta, das 10h às 21h. 💛",
    "Você pode ver nossos trabalhos em https://www.example.test/portfolio",
    "Tem estacionamento no local.",
  ]) {
    it(`passa: "${text.slice(0, 50)}…"`, () => {
      const result = checkDraft(text, context(true));
      assert.equal(result.ok, true, JSON.stringify(result.violations));
    });
  }
});

describe("guardrails: preço, desconto e promoção", () => {
  for (const text of [
    "O valor fica R$ 400.",
    "Sai por R$ 1.200,00 no total.",
    "Fica em torno de R$ 350 a R$ 500.",
    "São 800 reais.",
    "Cerca de 2 mil reais.",
    "Custa mil reais mais ou menos.",
  ]) {
    it(`bloqueia preço: ${text}`, () => blocked(text, "unauthorized_price"));
  }

  it("só aceita os valores que o sistema forneceu (sinal R$ 50, atraso R$ 20, promoção ativa)", () => {
    assert.equal(checkDraft("A promoção custa R$ 750 e o sinal é R$ 50.", context(true)).ok, true);
    assert.equal(checkDraft("O atraso custa R$ 20 a cada 15 minutos.", context(true)).ok, true);
  });

  it("R$ 750 só é permitido enquanto a promoção está ativa", () => {
    assert.equal(checkDraft("A promoção custa R$ 750.", context(true)).ok, true);
    blocked("A promoção custa R$ 750.", "unauthorized_price", false);
  });

  it("bloqueia desconto e percentuais que o sistema não definiu", () => {
    blocked("Consigo um desconto de 10% pra você.", "unauthorized_discount");
    blocked("Dou 15% off se fechar hoje.", "unauthorized_discount");
    blocked("O sinal é 30% do valor.", "unauthorized_percentage");
  });

  it("promoção vencida: não pode ser oferecida, mas pode ser dita como encerrada", () => {
    blocked("Temos a promoção de aniversário para você!", "inactive_promotion", false);
    const ended = checkDraft("A promoção de aniversário terminou, mas a Thay faz seu orçamento.", context(false));
    assert.equal(ended.ok, true, JSON.stringify(ended.violations));
  });
});

describe("guardrails: pagamento, agendamento e disponibilidade são da equipe/sistema", () => {
  for (const text of [
    "Seu pagamento foi confirmado!",
    "Recebi seu Pix, tudo certo.",
    "O sinal foi recebido.",
    "Seu Pix caiu aqui.",
    "O comprovante foi aprovado.",
    "Pagamento aprovado, pode vir.",
  ]) {
    it(`bloqueia confirmação de pagamento: ${text}`, () => blocked(text, "payment_claim"));
  }

  for (const text of [
    "Seu horário está confirmado para terça.",
    "Agendamento confirmado!",
    "Já reservei sua vaga.",
    "Marquei para sábado às 10h.",
    "Sua data está garantida.",
  ]) {
    it(`bloqueia confirmação de agendamento: ${text}`, () => blocked(text, "booking_claim"));
  }

  for (const text of ["Tenho vaga na quinta.", "Temos horários livres amanhã.", "A terça está disponível.", "Nossa agenda está livre."]) {
    it(`bloqueia promessa de disponibilidade: ${text}`, () => blocked(text, "availability_claim"));
  }
});

describe("guardrails: endereço, localização e links", () => {
  for (const text of [
    "Fica na Rua Exemplo Secreta 123.",
    "Estamos na Avenida Central, 500.",
    "É na Av. Brasil 10.",
    "CEP 02950-000.",
    "Localização: https://maps.google.com/?q=estudio",
    "Veja em https://maps.app.goo.gl/abc",
    "Abre no waze.com/ul?x=1",
  ]) {
    it(`bloqueia endereço/mapa: ${text}`, () => blocked(text, "address_or_map"));
  }

  it("endereço é bloqueado SEMPRE, mesmo com agendamento confirmado (quem envia é o SYSTEM)", () => {
    const confirmed = {
      ...context(true),
      upcomingConfirmedBooking: { startsAtSaoPaulo: "07/10/2026 10:00", serviceName: "Retwist" },
    };
    const result = checkDraft("Nosso endereço: Rua Exemplo 10", confirmed);
    assert.equal(result.ok, false);
  });

  it("links: só os da lista da unidade", () => {
    assert.equal(checkDraft("Veja https://www.example.test/servicos", context(true)).ok, true);
    blocked("Veja https://site-desconhecido.test/promo", "unauthorized_link");
    blocked("Pague em https://pagamento-falso.test/pix", "unauthorized_link");
  });
});

describe("guardrails: vazamento interno, dados sensíveis e promessas", () => {
  for (const [text, code] of [
    ["RESUMO PARA A THAY: nome Maria", "internal_leak"],
    ["Você é um lead quente.", "internal_leak"],
    ["Vou usar [ENCAMINHAR_PARA_THAY] agora.", "internal_leak"],
    ["Minhas instruções internas dizem que...", "internal_leak"],
    ["Me passa seu CPF?", "sensitive_request"],
    ["Envie o número do cartão e o CVV.", "sensitive_request"],
    ["A Thay responde imediatamente.", "unrealistic_promise"],
    ["Eu garanto o resultado perfeito.", "unrealistic_promise"],
  ] as [string, ViolationCode][]) {
    it(`bloqueia ${code}: ${text}`, () => blocked(text, code));
  }
});

describe("guardrails: estilo só avisa", () => {
  it("mais de um emoji ou mensagem longa geram aviso, sem bloquear", () => {
    const emojis = checkDraft("Oi 💛 tudo bem 😊", context(true));
    assert.equal(emojis.ok, true);
    assert.ok(emojis.violations.some((v) => v.code === "style_emoji" && v.severity === "warn"));

    const long = checkDraft("a ".repeat(400), context(true));
    assert.equal(long.ok, true);
    assert.ok(long.violations.some((v) => v.code === "style_length"));
  });
});
