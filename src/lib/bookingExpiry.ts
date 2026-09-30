import { pendingPaymentCutoff } from "./bookingRules";

// Marca como EXPIRED os agendamentos que ficaram aguardando pagamento além do
// prazo. A agenda já ignora esses agendamentos por conta própria (ver
// `activeBookingWhere`); esta rotina só organiza o status. Agendamentos com
// pagamento aprovado NUNCA expiram.

export type PendingBooking = { id: string; hasApprovedPayment: boolean };

export interface ExpiryStore {
  /** Agendamentos PENDING_PAYMENT criados até `cutoff`. */
  findPendingCreatedUntil(cutoff: Date): Promise<PendingBooking[]>;
  /** Troca atômica PENDING_PAYMENT → EXPIRED. `false` se o status mudou no meio do caminho. */
  expire(bookingId: string): Promise<boolean>;
}

export type ExpiryReport = { checked: number; expired: number; skippedPaid: number };

export async function expireStaleBookings(
  store: ExpiryStore,
  now: Date = new Date(),
): Promise<ExpiryReport> {
  const pending = await store.findPendingCreatedUntil(pendingPaymentCutoff(now));

  let expired = 0;
  let skippedPaid = 0;

  for (const booking of pending) {
    if (booking.hasApprovedPayment) {
      skippedPaid += 1;
      continue;
    }
    if (await store.expire(booking.id)) expired += 1;
  }

  return { checked: pending.length, expired, skippedPaid };
}
