import { refundIdempotencyKey, type RefundGateway } from "./cancellation";
import { duplicatesToRefund, type PaymentChoice } from "./paymentOptions";

// Depois que um pagamento (sinal ou valor total) é aprovado:
//  - se o mesmo agendamento já tem outro pagamento aprovado (ex.: o cliente
//    abriu a cobrança do sinal e a do total e pagou as duas), fica o primeiro
//    e os demais são estornados automaticamente;
//  - o agendamento passa a refletir o que ficou pago: sinal (restante no dia)
//    ou valor total (nada a pagar no dia).

export type ApprovedPayment = { id: string; mpPaymentId: string; type: PaymentChoice };

export interface SettlementStore {
  /** Pagamentos de sinal/total APROVADOS (não estornados) do agendamento. */
  listApprovedPayments(bookingId: string): Promise<ApprovedPayment[]>;
  markPaymentRefunded(paymentId: string): Promise<void>;
}

export type DuplicateResolution = {
  /** O pagamento que fica valendo. */
  keeper: ApprovedPayment | null;
  /** Ids estornados agora. */
  refunded: string[];
  /** Ids cujo estorno falhou (precisam de atenção da equipe). */
  failed: string[];
};

export async function resolveDuplicatePayments(
  bookingId: string,
  store: SettlementStore,
  gateway: Pick<RefundGateway, "refund">,
): Promise<DuplicateResolution> {
  const approved = await store.listApprovedPayments(bookingId);
  const extras = new Set(duplicatesToRefund(approved));
  const keeper = approved.find((payment) => !extras.has(payment.id)) ?? null;
  const refunded: string[] = [];
  const failed: string[] = [];

  for (const payment of approved) {
    if (!extras.has(payment.id)) continue;
    try {
      // Mesma chave do cancelamento: nunca há dois estornos do mesmo pagamento.
      await gateway.refund(payment.mpPaymentId, refundIdempotencyKey(payment.id));
      await store.markPaymentRefunded(payment.id);
      refunded.push(payment.id);
    } catch (error) {
      failed.push(payment.id);
      console.error("Falha ao estornar pagamento em duplicidade", { bookingId, paymentId: payment.id, error });
    }
  }
  return { keeper, refunded, failed };
}

/** Campos do agendamento conforme o que ficou pago. */
export function bookingPaymentFields(
  choice: PaymentChoice,
  amounts: { servicePrice: number; depositAmount: number },
): { paymentOption: PaymentChoice; remainingAmount: number } {
  const remaining = choice === "FULL" ? 0 : Math.max(0, Math.round((amounts.servicePrice - amounts.depositAmount) * 100) / 100);
  return { paymentOption: choice, remainingAmount: remaining };
}
