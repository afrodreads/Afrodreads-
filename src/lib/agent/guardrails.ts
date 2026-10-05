import type { AgentContext } from "./context";

// Guardrails em CÓDIGO sobre o rascunho do modelo. O prompt pede para não
// inventar, mas para informação crítica isso não basta: aqui o texto é
// verificado e, se violar, o rascunho é bloqueado (ver orchestrator.ts).
//
// Cobre: preço, desconto, promoção, disponibilidade/agenda, pagamento,
// endereço/localização/mapa, confirmação de agendamento, links, vazamento de
// instruções internas e pedido de dado sensível.
//
// O agente NUNCA envia endereço nem link de mapa: isso é evento SYSTEM, com dado
// do cofre da unidade. Por isso endereço/mapa é barrado sempre, mesmo com
// agendamento confirmado.

export type ViolationCode =
  | "unauthorized_price"
  | "unauthorized_discount"
  | "unauthorized_percentage"
  | "inactive_promotion"
  | "payment_claim"
  | "booking_claim"
  | "availability_claim"
  | "address_or_map"
  | "unauthorized_link"
  | "internal_leak"
  | "sensitive_request"
  | "unrealistic_promise"
  | "response_too_long"
  | "model_refusal"
  | "truncated_response"
  | "style_emoji"
  | "style_length"
  | "repeated_reply";

export type Severity = "block" | "warn";

export type Violation = { code: ViolationCode; severity: Severity; excerpt: string };

export type GuardrailResult = {
  /** false quando existe qualquer violação de severidade "block". */
  ok: boolean;
  violations: Violation[];
};

const MAX_LENGTH = 700;
/** Acima disto o rascunho nem é considerado: longo demais para WhatsApp. */
export const MAX_CANDIDATE_CHARS = 1500;

// --- valores escritos por extenso ("quatrocentos reais", "R$ setecentos")
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8,
  nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300,
  trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600,
  seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900,
  novecentas: 900,
};
const WORD_ALT = [...Object.keys(NUMBER_WORDS), "mil"].sort((a, b) => b.length - a.length).join("|");
const WORD = `(?<!\\p{L})(?:${WORD_ALT})(?!\\p{L})`;
const NUMBER_PHRASE = `${WORD}(?:\\s+(?:e\\s+)?${WORD})*`;
const CURRENCY_AFTER = "(?:reais|real|contos?|pilas?)";

/** "mil e duzentos" → 1200; "quatrocentos e cinquenta" → 450. */
function parseNumberWords(phrase: string): number {
  let total = 0;
  let current = 0;
  for (const word of phrase.toLowerCase().split(/\s+/).filter((w) => w && w !== "e")) {
    if (word === "mil") {
      total += (current || 1) * 1000;
      current = 0;
    } else {
      current += NUMBER_WORDS[word] ?? 0;
    }
  }
  return total + current;
}

function excerptOf(text: string, index: number): string {
  return text.slice(Math.max(0, index - 10), index + 40).replace(/\s+/g, " ").trim();
}

function findAll(text: string, pattern: RegExp): { match: string; index: number }[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const found: { match: string; index: number }[] = [];
  for (let m = regex.exec(text); m; m = regex.exec(text)) found.push({ match: m[0], index: m.index });
  return found;
}

function matchesAny(text: string, patterns: RegExp[]): { match: string; index: number } | null {
  for (const pattern of patterns) {
    const hit = findAll(text, pattern)[0];
    if (hit) return hit;
  }
  return null;
}

/** "1.234,50" → 1234.5; "50" → 50. */
function parseBrl(raw: string): number {
  const cleaned = raw.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(cleaned);
}

const PAYMENT_CLAIMS = [
  /pagamento\s+(foi\s+|j[aá]\s+)?(confirmad|aprovad|recebid|identificad)/i,
  /sinal\s+(foi\s+|j[aá]\s+)?(confirmad|aprovad|recebid|identificad|pago)/i,
  /(recebi|recebemos|identifiquei|confirmei)\s+(o\s+|seu\s+)?(pagamento|pix|sinal|dep[oó]sito)/i,
  /(pix|dep[oó]sito|transfer[eê]ncia)\s+(caiu|confirmad|recebid|identificad)/i,
  /comprovante\s+(foi\s+)?(confirmad|aprovad|validad)/i,
  /pagamento\s+(caiu|entrou|t[aá]\s+ok|est[aá]\s+ok|deu\s+certo)/i,
  /\b(caiu|entrou)\s+(o\s+|seu\s+)?(pix|pagamento|sinal)/i,
];

const BOOKING_CLAIMS = [
  /(hor[aá]rio|agendamento|data|vaga|reserva)\s+(est[aá]\s+|foi\s+|ficou\s+|j[aá]\s+est[aá]\s+)?(confirmad|garantid|reservad|marcad|agendad)/i,
  /\b(reservei|agendei|marquei|garanti)\b/i,
  /\bconfirmad[oa]\s+(para|pra)\b/i,
  /^\s*confirmad[oa]\b/i,
  /\bt[aá]\s+(confirmad|marcad|agendad)/i,
  /\bpode\s+vir\b/i,
];

const AVAILABILITY_CLAIMS = [
  /\b(tenho|temos|h[aá])\s+(uma\s+|algumas\s+)?(vagas?|hor[aá]rios?)\b/i,
  /\btem\s+(uma\s+)?vagas?\b/i,
  /\bvagas?\s+(amanh[aã]|hoje|para|pra|na|no|dispon)/i,
  /\b(consigo|conseguimos|d[aá]\s+pra)\s+(te\s+)?encaixar\b/i,
  /(est[aá]|fica|ficou)\s+dispon[ií]vel/i,
  /(agenda|hor[aá]rio)\s+(est[aá]\s+)?livre/i,
];

const ADDRESS_OR_MAP = [
  /(maps\.google|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|waze\.com)/i,
  /\b(?:[Rr]ua|[Aa]venida|[Aa]v\.|[Tt]ravessa|[Aa]lameda|[Ee]strada|[Rr]odovia)\s+[A-ZÀ-Ú0-9]/,
  /\b\d{5}-?\d{3}\b/, // CEP
  /endere[cç]o\s+(completo\s+)?([eé]|fica)\s*:?\s*(na|no|em)?\s*[A-ZÀ-Ú0-9]/,
];

const INTERNAL_LEAKS = [
  /RESUMO\s+PARA\s+A\b/i,
  /temperatura\s+do\s+lead/i,
  /\blead\s+(quente|morno|frio)\b/i,
  /\[(ENCAMINHAR|PAUSAR|ENVIAR|ETIQUETAR|NOTIFICAR)[^\]]*\]/i,
  /(system\s+prompt|prompt\s+do\s+sistema|minhas\s+instru[cç][oõ]es)/i,
  /\bprompt\b/i,
  /DADOS\s+DO\s+SISTEMA|REGRAS\s+DE\s+EXECU[CÇ][AÃ]O|HIERARQUIA\s+DE\s+REGRAS|CHECKLIST\s+INTERNO/i,
  /\b(request_handoff|update_lead_data|STATUS_CONVERSA|modo\s+sombra|guardrails?)\b/i,
  /\{\{|\}\}/,
];

const SENSITIVE_REQUESTS = [
  /\b(cpf|senha|cvv)\b/i,
  /c[oó]digo\s+de\s+seguran[cç]a/i,
  /n[uú]mero\s+(completo\s+)?do\s+cart[aã]o/i,
  /\bdados\s+(do\s+)?cart[aã]o\b/i,
  /chave\s+pix\s*([eé]|:)\s*\S/i,
  /\bag[eê]ncia\s*:?\s*\d|\bconta\s*(corrente)?\s*:?\s*\d{3,}/i,
];

const UNREALISTIC_PROMISES = [
  /(ela|a\s+\w+|a\s+equipe)\s+(vai\s+)?responde(r)?\s+(imediatamente|agora\s+mesmo)/i,
  /garant(o|imos|ia)\s+(o\s+)?resultado/i,
];

const PROMOTION_ENDED = /(terminou|encerrad|n[aã]o\s+(est[aá]\s+mais|h[aá])|acabou|finalizou|expirou|n[aã]o\s+temos\s+promo)/i;

const normalizeForRepeat = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

export function checkDraft(text: string, context: AgentContext): GuardrailResult {
  const violations: Violation[] = [];
  const add = (code: ViolationCode, severity: Severity, index: number) =>
    violations.push({ code, severity, excerpt: excerptOf(text, index) });

  // --- preço: só os valores que o sistema forneceu (sinal, atraso, promoção ativa)
  const allowedAmounts = new Set<number>([
    ...context.policy.quotableAmountsBrl,
    ...context.promotions.flatMap((promotion) => (promotion.priceBrl !== null ? [promotion.priceBrl] : [])),
  ]);
  const checkAmount = (amount: number, index: number) => {
    if (!allowedAmounts.has(amount)) add("unauthorized_price", "block", index);
  };
  // R$ 400 / R$ 1.234,56
  for (const { match, index } of findAll(text, /R\$\s*(\d[\d.]*(?:,\d{1,2})?)/i)) {
    checkAmount(parseBrl(match.replace(/R\$\s*/i, "")), index);
  }
  // 400 reais / 2 mil / 1,2k
  for (const { match, index } of findAll(text, /\b(\d[\d.,]*)\s*(reais|real|contos?|mil)\b/i)) {
    const [, number, unit] = /(\d[\d.,]*)\s*(\S+)/.exec(match) ?? [];
    checkAmount(parseBrl(number) * (unit.toLowerCase() === "mil" ? 1000 : 1), index);
  }
  for (const { match, index } of findAll(text, /\b(\d+(?:[.,]\d+)?)\s?k\b/i)) {
    checkAmount(Number(match.replace(/\s?k$/i, "").replace(",", ".")) * 1000, index);
  }
  // por extenso: "quatrocentos reais", "R$ setecentos", "mil e duzentos reais"
  for (const { match, index } of findAll(text, new RegExp(`R\\$\\s*(${NUMBER_PHRASE})`, "iu"))) {
    checkAmount(parseNumberWords(match.replace(/R\$\s*/i, "")), index);
  }
  for (const { match, index } of findAll(text, new RegExp(`(${NUMBER_PHRASE})\\s+${CURRENCY_AFTER}(?!\\p{L})`, "iu"))) {
    checkAmount(parseNumberWords(match.replace(new RegExp(`\\s+${CURRENCY_AFTER}$`, "i"), "")), index);
  }

  // --- desconto e percentuais
  for (const { index } of findAll(text, /desconto\s+de\s+\d|\d+\s?%\s+de\s+desconto|\d+\s?%\s+off/i)) {
    add("unauthorized_discount", "block", index);
  }
  const allowedPercent = Math.round(context.policy.depositPercentage * 100);
  for (const { match, index } of findAll(text, /\b(\d{1,3})\s?%/)) {
    if (Number(match.replace(/\D/g, "")) !== allowedPercent) add("unauthorized_percentage", "block", index);
  }

  // --- promoção vencida ou inexistente
  if (context.promotions.length === 0) {
    const promo = findAll(text, /promo[cç][aã]o[^.!?]*anivers[aá]rio|anivers[aá]rio[^.!?]*promo[cç][aã]o/i)[0];
    if (promo && !PROMOTION_ENDED.test(text)) add("inactive_promotion", "block", promo.index);
  }

  // --- pagamento, agendamento e disponibilidade: só o sistema/equipe confirmam
  const payment = matchesAny(text, PAYMENT_CLAIMS);
  if (payment) add("payment_claim", "block", payment.index);
  const booking = matchesAny(text, BOOKING_CLAIMS);
  if (booking) add("booking_claim", "block", booking.index);
  const availability = matchesAny(text, AVAILABILITY_CLAIMS);
  if (availability) add("availability_claim", "block", availability.index);

  // --- endereço e mapa: nunca pelo agente
  const address = matchesAny(text, ADDRESS_OR_MAP);
  if (address) add("address_or_map", "block", address.index);

  // --- links: só os da lista da unidade
  const allowed = context.unit.allowedUrls.map((url) => url.replace(/\/+$/, "").toLowerCase());
  for (const { match, index } of findAll(text, /https?:\/\/[^\s)>"']+/i)) {
    const url = match.replace(/[.,;!?]+$/, "").replace(/\/+$/, "").toLowerCase();
    if (!allowed.some((base) => url === base || url.startsWith(`${base}/`))) {
      // Endereço/mapa já foi acusado acima; evita duplicar o mesmo problema.
      if (!ADDRESS_OR_MAP.some((pattern) => pattern.test(match))) add("unauthorized_link", "block", index);
    }
  }

  // --- vazamento interno, dado sensível, promessas irreais
  const leak = matchesAny(text, INTERNAL_LEAKS);
  if (leak) add("internal_leak", "block", leak.index);
  const sensitive = matchesAny(text, SENSITIVE_REQUESTS);
  if (sensitive) add("sensitive_request", "block", sensitive.index);
  const promise = matchesAny(text, UNREALISTIC_PROMISES);
  if (promise) add("unrealistic_promise", "block", promise.index);

  // --- estilo (não bloqueia)
  const emojis = findAll(text, /\p{Extended_Pictographic}/u);
  if (emojis.length > 1) add("style_emoji", "warn", emojis[1].index);
  if (text.length > MAX_CANDIDATE_CHARS) add("response_too_long", "block", MAX_CANDIDATE_CHARS);
  else if (text.length > MAX_LENGTH) add("style_length", "warn", MAX_LENGTH);

  // --- repetição: a mesma mensagem que já foi enviada por último não sai de novo
  const lastSent = [...context.messages].reverse().find((message) => message.role === "assistant");
  if (lastSent && normalizeForRepeat(lastSent.text) === normalizeForRepeat(text)) add("repeated_reply", "block", 0);

  return { ok: !violations.some((violation) => violation.severity === "block"), violations };
}
