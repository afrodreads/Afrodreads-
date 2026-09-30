import type { Booking } from "@prisma/client";
import { isDepositRefundable } from "./pricing";

// Regra única de cancelamento, usada pelo painel e por qualquer outro canal.
// Sem acesso direto ao banco nem ao Mercado Pago: quem chama injeta o `store`
// e o `gateway` (Prisma/Mercado Pago em produção, fakes nos testes).
//
// Garantias:
// - o cancelamento é uma troca atômica de status: só UMA chamada "ganha" e
//   faz o estorno (duas chamadas simultâneas nunca estornam duas vezes);
// - o estorno usa chave de idempotência fixa por pagamento, então repetir a
//   chamada (ex.: tentar de novo após falha) nunca gera estorno duplicado;
// - só há estorno quando existe sinal APROVADO e a regra de devolução se aplica.

/** `client`: pedido do cliente (vale a regra de 2 dias). `studio`: o estúdio não pôde atender (sempre devolve). */
export type CancelInitiator = "client" | "studio";

export type ApprovedDeposit = { id: string; mpPaymentId: string };

export interface CancellationStore {
  findBooking(id: string): Promise<Booking | null>;
  findApprovedDeposit(bookingId: string): Promise<ApprovedDeposit | null>;
  /** Troca atômica PENDING_PAYMENT/CONFIRMED → CANCELLED. `null` se outra chamada já mudou o status. */
  claimCancellation(
    bookingId: string,
    data: { cancelledAt: Date; refundEligible: boolean | null },
  ): Promise<Booking | null>;
  markDepositRefunded(paymentId: string): Promise<void>;
}

export interface RefundGateway {
  refund(mpPaymentId: string, idempotencyKey: string): Promise<void>;
}

export type CancelResult =
  | { kind: "not_found" }
  | { kind: "not_cancellable"; booking: Booking }
  | {
      kind: "cancelled" | "already_cancelled";
      booking: Booking;
      refundEligible: boolean;
      depositRefunded: boolean;
      refundError: boolean;
    };

export function refundIdempotencyKey(paymentId: string): string {
  return `refund-${paymentId}`;
}

export async function cancelBooking(
  params: { bookingId: string; initiator?: CancelInitiator; now?: Date },
  store: CancellationStore,
  gateway: RefundGateway,
): Promise<CancelResult> {
  const { bookingId, initiator = "client", now = new Date() } = params;

  // Estorna (ou tenta de novo) o sinal de um agendamento já cancelado e elegível.
  const settle = async (
    kind: "cancelled" | "already_cancelled",
    booking: Booking,
  ): Promise<CancelResult> => {
    let depositRefunded = false;
    let refundError = false;

    if (booking.cancellationRefundedDeposit === true) {
      const deposit = await store.findApprovedDeposit(booking.id);
      if (deposit) {
        try {
          await gateway.refund(deposit.mpPaymentId, refundIdempotencyKey(deposit.id));
          await store.markDepositRefunded(deposit.id);
          depositRefunded = true;
        } catch (error) {
          // Uma falha no estorno não desfaz o cancelamento: o sinal continua
          // APPROVED e chamar o cancelamento de novo tenta o estorno outra vez.
          refundError = true;
          console.error("Falha ao estornar sinal", { bookingId: booking.id, error });
        }
      }
    }

    return {
      kind,
      booking,
      refundEligible: booking.cancellationRefundedDeposit === true,
      depositRefunded,
      refundError,
    };
  };

  const existing = await store.findBooking(bookingId);
  if (!existing) return { kind: "not_found" };

  if (existing.status === "CANCELLED") return settle("already_cancelled", existing);

  if (existing.status !== "PENDING_PAYMENT" && existing.status !== "CONFIRMED") {
    return { kind: "not_cancellable", booking: existing };
  }

  const deposit = await store.findApprovedDeposit(bookingId);
  const refundable =
    initiator === "studio" ||
    isDepositRefundable({ scheduledStart: existing.scheduledStart, cancellationRequestedAt: now });

  // Sem sinal pago não há o que devolver: o campo fica nulo em vez de "true".
  const claimed = await store.claimCancellation(bookingId, {
    cancelledAt: now,
    refundEligible: deposit ? refundable : null,
  });

  if (!claimed) {
    // Outra chamada ganhou a disputa. Não estornamos aqui: quem ganhou cuida disso.
    const current = await store.findBooking(bookingId);
    if (!current) return { kind: "not_found" };
    if (current.status === "CANCELLED") {
      return {
        kind: "already_cancelled",
        booking: current,
        refundEligible: current.cancellationRefundedDeposit === true,
        depositRefunded: false,
        refundError: false,
      };
    }
    return { kind: "not_cancellable", booking: current };
  }

  return settle("cancelled", claimed);
}
