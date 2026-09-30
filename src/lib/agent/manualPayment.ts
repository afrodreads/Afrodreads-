import { z } from "zod";
import { InvalidInputError, UniqueConflictError } from "../conversations/errors";
import { isPaymentWindowOpen } from "../bookingRules";
import { assertStaff, type StaffActor } from "./actors";

// Confirmação MANUAL de pagamento (Pix/depósito/transferência).
//
//   Cliente envia o comprovante → a equipe confere → a equipe confirma no painel
//   → o sistema registra (auditável) → evento SYSTEM dispara a confirmação oficial.
//
// A IA não participa: só uma pessoa autorizada (`StaffActor`) passa por aqui, e o
// modelo não tem ferramenta para isto. O serviço NÃO mexe em dinheiro real; só
// registra que a equipe conferiu e confirma o agendamento.
//
// Nesta fase o fluxo é arquitetura + regras testadas. O adaptador do banco e a
// rota do painel dependem de uma tabela nova (ver relatório) e não foram criados.

export const MANUAL_PAYMENT_METHODS = ["PIX", "BANK_DEPOSIT", "BANK_TRANSFER"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

const inputSchema = z.object({
  bookingId: z.string().min(1).max(64),
  amountBrl: z.number().positive().max(100_000),
  method: z.enum(MANUAL_PAYMENT_METHODS),
  /** Referência/ID do comprovante, quando houver (nunca a imagem). */
  reference: z.string().trim().max(200).nullish(),
  /** Mesma chave = mesma confirmação (clique duplo, retry). */
  idempotencyKey: z.string().min(8).max(100),
});

export type ConfirmManualPaymentInput = z.input<typeof inputSchema>;

export type ConfirmableStatus = "PENDING_PAYMENT" | "EXPIRED";

export type ManualPaymentBooking = {
  id: string;
  status: string;
  depositAmountBrl: number;
  createdAt: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
};

/** Registro de auditoria da confirmação manual. */
export type ManualPaymentRecord = {
  bookingId: string;
  amountBrl: number;
  method: ManualPaymentMethod;
  confirmedBy: string;
  confirmedAt: Date;
  reference: string | null;
  previousStatus: string;
  newStatus: "CONFIRMED";
  idempotencyKey: string;
};

export interface ManualPaymentStore {
  findBooking(bookingId: string): Promise<ManualPaymentBooking | null>;
  findByIdempotencyKey(key: string): Promise<ManualPaymentRecord | null>;
  /** Existe outro agendamento ativo no mesmo horário? */
  hasOtherActiveBooking(booking: ManualPaymentBooking, now: Date): Promise<boolean>;
  /**
   * Em UMA transação: troca o status para CONFIRMED só se ainda estiver em um dos
   * `fromStatuses` e grava o registro de auditoria. Devolve false se o status já
   * mudou. Lança UniqueConflictError se a chave de idempotência já existe.
   */
  confirm(args: {
    bookingId: string;
    fromStatuses: ConfirmableStatus[];
    record: ManualPaymentRecord;
  }): Promise<boolean>;
}

/** Evento para o despachante SYSTEM (confirmação oficial + card + localização). */
export type PaymentConfirmedEvent = { type: "PAYMENT_CONFIRMED"; eventId: string; bookingId: string };

export type ConfirmManualPaymentResult =
  | { kind: "confirmed"; record: ManualPaymentRecord; event: PaymentConfirmedEvent }
  | { kind: "already_confirmed"; record: ManualPaymentRecord } // repetição idempotente
  | { kind: "not_found" }
  | { kind: "not_confirmable"; status: string }
  | { kind: "amount_below_deposit"; requiredBrl: number }
  // O horário foi ocupado por outra pessoa: a equipe decide (ex.: devolver o valor manualmente).
  | { kind: "slot_unavailable" };

export function paymentConfirmedEvent(record: ManualPaymentRecord): PaymentConfirmedEvent {
  return {
    type: "PAYMENT_CONFIRMED",
    eventId: `payment-confirmed:${record.bookingId}:${record.idempotencyKey}`,
    bookingId: record.bookingId,
  };
}

export async function confirmManualPayment(
  store: ManualPaymentStore,
  params: { actor: StaffActor; input: ConfirmManualPaymentInput; now?: Date },
): Promise<ConfirmManualPaymentResult> {
  // Primeiro de tudo: só a equipe. A IA e o sistema param aqui, antes de qualquer leitura.
  assertStaff(params.actor);

  const parsed = inputSchema.safeParse(params.input);
  if (!parsed.success) throw new InvalidInputError("Dados da confirmação de pagamento inválidos.");
  const input = parsed.data;
  const now = params.now ?? new Date();

  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (existing.bookingId !== input.bookingId) {
      throw new InvalidInputError("Esta chave de idempotência já foi usada em outro agendamento.");
    }
    return { kind: "already_confirmed", record: existing };
  }

  const booking = await store.findBooking(input.bookingId);
  if (!booking) return { kind: "not_found" };

  if (booking.status !== "PENDING_PAYMENT" && booking.status !== "EXPIRED") {
    return { kind: "not_confirmable", status: booking.status };
  }

  // O valor conferido precisa cobrir o sinal combinado.
  if (input.amountBrl < booking.depositAmountBrl) {
    return { kind: "amount_below_deposit", requiredBrl: booking.depositAmountBrl };
  }

  // Prazo vencido ou já expirado: só confirma se o horário ainda estiver livre.
  const windowOpen = isPaymentWindowOpen(booking, now);
  if (!windowOpen && (await store.hasOtherActiveBooking(booking, now))) {
    return { kind: "slot_unavailable" };
  }

  const record: ManualPaymentRecord = {
    bookingId: booking.id,
    amountBrl: input.amountBrl,
    method: input.method,
    confirmedBy: params.actor.userId.trim(),
    confirmedAt: now,
    reference: input.reference?.trim() || null,
    previousStatus: booking.status,
    newStatus: "CONFIRMED",
    idempotencyKey: input.idempotencyKey,
  };

  try {
    const changed = await store.confirm({
      bookingId: booking.id,
      fromStatuses: ["PENDING_PAYMENT", "EXPIRED"],
      record,
    });
    if (!changed) {
      const current = await store.findBooking(booking.id);
      return { kind: "not_confirmable", status: current?.status ?? "UNKNOWN" };
    }
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      // Outra chamada com a mesma chave venceu a corrida: devolve o registro dela.
      const winner = await store.findByIdempotencyKey(input.idempotencyKey);
      if (winner) return { kind: "already_confirmed", record: winner };
    }
    throw error;
  }

  return { kind: "confirmed", record, event: paymentConfirmedEvent(record) };
}
