// Pagamento do agendamento: sinal (restante no dia) ou valor total agora.
// Regras puras, testadas; quem fala com o Mercado Pago e com o banco usa daqui.

export type PaymentChoice = "DEPOSIT" | "FULL";
export type QuotePaymentChoices = "CLIENT_CHOICE" | "DEPOSIT_ONLY" | "FULL_ONLY";

export const QUOTE_CHOICE_LABEL: Record<QuotePaymentChoices, string> = {
  CLIENT_CHOICE: "Cliente escolhe (sinal ou total)",
  DEPOSIT_ONLY: "Só sinal",
  FULL_ONLY: "Só valor total",
};

type Amounts = { servicePrice: number; depositAmount: number };

const cents = (value: number) => Math.round(value * 100) / 100;

/** Opções oferecidas ao cliente. Sem orçamento (agendamento antigo): as duas. */
export function allowedChoices(quoteChoices: QuotePaymentChoices | null | undefined): PaymentChoice[] {
  if (quoteChoices === "DEPOSIT_ONLY") return ["DEPOSIT"];
  if (quoteChoices === "FULL_ONLY") return ["FULL"];
  return ["DEPOSIT", "FULL"];
}

export function amountFor(choice: PaymentChoice, amounts: Amounts): number {
  return cents(choice === "FULL" ? amounts.servicePrice : amounts.depositAmount);
}

/** O valor total é uma opção diferente do sinal? (serviço de até R$ 50 já é pago inteiro no sinal) */
export function fullDiffersFromDeposit(amounts: Amounts): boolean {
  return cents(amounts.servicePrice) > cents(amounts.depositAmount);
}

/**
 * Qual opção um pagamento aprovado quitou, pelo VALOR que o Mercado Pago
 * informa (não pela escolha gravada, que o cliente pode ter trocado depois de
 * abrir a cobrança anterior).
 */
export function classifyPaidAmount(paid: number, amounts: Amounts): PaymentChoice {
  return fullDiffersFromDeposit(amounts) && cents(paid) >= cents(amounts.servicePrice) ? "FULL" : "DEPOSIT";
}

/**
 * Pagamentos aprovados em duplicidade (ex.: pagou o sinal e também o total):
 * fica o valor total, se houver (o serviço já está quitado e só o sinal volta);
 * entre pagamentos do mesmo tipo, o primeiro (menor id do Mercado Pago, que
 * cresce com o tempo). Os demais devem ser estornados. A decisão é a mesma em
 * qualquer ordem de webhook.
 */
export function duplicatesToRefund(
  approved: readonly { id: string; mpPaymentId: string; type?: PaymentChoice }[],
): string[] {
  if (approved.length <= 1) return [];
  const rank = (type?: PaymentChoice) => (type === "FULL" ? 0 : 1);
  const sorted = [...approved].sort(
    (a, b) => rank(a.type) - rank(b.type) || compareMpIds(a.mpPaymentId, b.mpPaymentId),
  );
  return sorted.slice(1).map((payment) => payment.id);
}

function compareMpIds(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const [x, y] = [BigInt(a), BigInt(b)];
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return a.localeCompare(b);
}

/**
 * Cancelamento sem direito a devolução (menos de 2 dias) de quem pagou o valor
 * total: o estúdio retém só o valor do sinal e devolve o restante.
 */
export function lateCancellationRefund(params: { paid: number; depositAmount: number; alreadyRefunded: number }): number {
  return Math.max(0, cents(params.paid - params.depositAmount - params.alreadyRefunded));
}
