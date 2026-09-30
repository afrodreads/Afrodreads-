import { pendingPaymentCutoff } from "./bookingRules";

// Marca como EXPIRED os agendamentos que ficaram aguardando pagamento além do
// prazo. A agenda já ignora esses agendamentos por conta própria (ver
// `activeBookingWhere`); esta rotina só organiza o status. Agendamentos com
// pagamento aprovado NUNCA expiram, nem os que tiveram o prazo estendido pela
// equipe e ainda estão dentro do novo prazo.

export type PendingBooking = { id: string; hasApprovedPayment: boolean; paymentDueAt?: Date | null };

export interface ExpiryStore {
  /** Agendamentos PENDING_PAYMENT criados até `cutoff`. */
  findPendingCreatedUntil(cutoff: Date): Promise<PendingBooking[]>;
  /**
   * Troca atômica PENDING_PAYMENT → EXPIRED, só se não houver prazo estendido
   * ainda válido em `now`. `false` se o status/prazo mudou no meio do caminho.
   */
  expire(bookingId: string, now: Date): Promise<boolean>;
}

export type ExpiryReport = { checked: number; expired: number; skippedPaid: number; skippedHeld: number };

export async function expireStaleBookings(
  store: ExpiryStore,
  now: Date = new Date(),
): Promise<ExpiryReport> {
  const pending = await store.findPendingCreatedUntil(pendingPaymentCutoff(now));

  let expired = 0;
  let skippedPaid = 0;
  let skippedHeld = 0;

  for (const booking of pending) {
    if (booking.hasApprovedPayment) {
      skippedPaid += 1;
      continue;
    }
    if (booking.paymentDueAt && booking.paymentDueAt.getTime() > now.getTime()) {
      skippedHeld += 1;
      continue;
    }
    if (await store.expire(booking.id, now)) expired += 1;
  }

  return { checked: pending.length, expired, skippedPaid, skippedHeld };
}
