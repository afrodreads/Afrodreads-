import type { Booking } from "@prisma/client";
import { isPaymentWindowOpen } from "./bookingRules";
import { refundIdempotencyKey, type RefundGateway } from "./cancellation";

// O que fazer com um pagamento de sinal APROVADO, conforme o estado do
// agendamento. O caso comum (agendamento ainda dentro do prazo) só confirma.
// O caso "pagamento atrasado" (prazo vencido ou agendamento já EXPIRED) nunca
// pode deixar o cliente pagando sem ter horário:
//   - se o horário ainda está livre, o agendamento é reconfirmado;
//   - se outra pessoa já pegou o horário, o sinal é estornado.

export type ApprovedPaymentOutcome =
  | "confirmed" // dentro do prazo: PENDING_PAYMENT → CONFIRMED
  | "reconfirmed" // pagamento atrasado, horário ainda livre
  | "refunded" // pagamento atrasado, horário ocupado: sinal estornado
  | "refund_failed" // pagamento atrasado, horário ocupado, estorno falhou (precisa de atenção)
  | "ignored"; // nada a fazer (já confirmado, cancelado, duplicado...)

export interface PaymentProcessingStore {
  findBooking(id: string): Promise<Booking | null>;
  /** Troca atômica PENDING_PAYMENT → CONFIRMED. */
  confirmIfPending(bookingId: string): Promise<boolean>;
  /** Existe outro agendamento ativo que ocupa o mesmo horário? */
  hasOtherActiveBooking(booking: Booking, now: Date): Promise<boolean>;
  /** Troca atômica PENDING_PAYMENT/EXPIRED → CONFIRMED. */
  reactivate(bookingId: string): Promise<boolean>;
  findPaymentByMpId(mpPaymentId: string): Promise<{ id: string; status: string } | null>;
  markPaymentRefunded(paymentId: string): Promise<void>;
}

export async function processApprovedPayment(
  params: { bookingId: string; mpPaymentId: string; now?: Date },
  store: PaymentProcessingStore,
  gateway: RefundGateway,
): Promise<ApprovedPaymentOutcome> {
  const { bookingId, mpPaymentId, now = new Date() } = params;

  const booking = await store.findBooking(bookingId);
  if (!booking) return "ignored";

  if (booking.status === "PENDING_PAYMENT" && isPaymentWindowOpen(booking, now)) {
    return (await store.confirmIfPending(bookingId)) ? "confirmed" : "ignored";
  }

  const isLate = booking.status === "PENDING_PAYMENT" || booking.status === "EXPIRED";
  if (!isLate) return "ignored";

  if (!(await store.hasOtherActiveBooking(booking, now))) {
    return (await store.reactivate(bookingId)) ? "reconfirmed" : "ignored";
  }

  const payment = await store.findPaymentByMpId(mpPaymentId);
  if (payment?.status === "REFUNDED") return "ignored";

  const key = refundIdempotencyKey(payment?.id ?? mpPaymentId);
  try {
    await gateway.refund(mpPaymentId, key);
    if (payment) await store.markPaymentRefunded(payment.id);
    return "refunded";
  } catch (error) {
    console.error("Falha ao estornar pagamento atrasado", { bookingId, mpPaymentId, error });
    return "refund_failed";
  }
}
