import { z } from "zod";
import { InvalidInputError, UniqueConflictError } from "../conversations/errors";
import { isPaymentWindowOpen } from "../bookingRules";
import { authorizeStaff, type StaffActor, type StaffDirectory } from "./actors";
import { paymentConfirmedEvent, type NewSystemEvent } from "./systemEvents";

// Confirmação MANUAL de pagamento (Pix/depósito/transferência).
//
//   Cliente envia o comprovante → a equipe confere → a equipe confirma no painel
//   → o sistema registra (auditável) → evento SYSTEM (PAYMENT_CONFIRMED) na fila.
//
// Só uma pessoa autorizada da equipe passa por aqui. A IA, o cliente e o SYSTEM
// não têm como: não existe StaffUser para eles e o modelo não tem ferramenta.
// O serviço não movimenta dinheiro; registra a conferência feita pela equipe.

export const MANUAL_PAYMENT_METHODS = ["PIX", "DEPOSIT", "TRANSFER"] as const;
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
  unitId: string | null;
  depositAmountBrl: number;
  createdAt: Date;
  paymentDueAt: Date | null;
  scheduledStart: Date;
  scheduledEnd: Date;
};

/** Registro de auditoria da confirmação manual. */
export type ManualPaymentRecord = {
  bookingId: string;
  amountBrl: number;
  method: ManualPaymentMethod;
  confirmedById: string;
  confirmedAt: Date;
  reference: string | null;
  previousStatus: string;
  newStatus: "CONFIRMED";
  idempotencyKey: string;
};

export interface ManualPaymentStore extends StaffDirectory {
  findBooking(bookingId: string): Promise<ManualPaymentBooking | null>;
  findConfirmationByIdempotencyKey(key: string): Promise<ManualPaymentRecord | null>;
  /** Existe outro agendamento ativo no mesmo horário? */
  hasOtherActiveBooking(booking: ManualPaymentBooking, now: Date): Promise<boolean>;
  /**
   * Em UMA transação: troca o status para CONFIRMED só se ainda estiver em um
   * dos `fromStatuses`, grava a auditoria e coloca o evento na fila (outbox).
   * false = o status já mudou. Lança UniqueConflictError se a chave já existe.
   */
  confirm(args: {
    fromStatuses: ConfirmableStatus[];
    record: ManualPaymentRecord;
    event: NewSystemEvent;
  }): Promise<boolean>;
}

export type ConfirmManualPaymentResult =
  | { kind: "confirmed"; record: ManualPaymentRecord; event: NewSystemEvent }
  | { kind: "already_confirmed"; record: ManualPaymentRecord } // repetição idempotente
  | { kind: "not_found" }
  | { kind: "not_confirmable"; status: string }
  | { kind: "amount_below_deposit"; requiredBrl: number }
  // O horário foi ocupado por outra pessoa: a equipe decide (ex.: devolver manualmente).
  | { kind: "slot_unavailable" };

export async function confirmManualPayment(
  store: ManualPaymentStore,
  params: { actor: StaffActor; input: ConfirmManualPaymentInput; now?: Date },
): Promise<ConfirmManualPaymentResult> {
  const parsed = inputSchema.safeParse(params.input);
  if (!parsed.success) throw new InvalidInputError("Dados da confirmação de pagamento inválidos.");
  const input = parsed.data;
  const now = params.now ?? new Date();

  const booking = await store.findBooking(input.bookingId);
  // Autoriza antes de qualquer resposta que revele o estado do agendamento.
  const staff = await authorizeStaff(store, params.actor, "CONFIRM_MANUAL_PAYMENT", {
    unitId: booking?.unitId ?? null,
  });

  const existing = await store.findConfirmationByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (existing.bookingId !== input.bookingId) {
      throw new InvalidInputError("Esta chave de idempotência já foi usada em outro agendamento.");
    }
    return { kind: "already_confirmed", record: existing };
  }

  if (!booking) return { kind: "not_found" };
  if (booking.status !== "PENDING_PAYMENT" && booking.status !== "EXPIRED") {
    return { kind: "not_confirmable", status: booking.status };
  }

  // O valor conferido precisa cobrir o sinal combinado.
  if (input.amountBrl < booking.depositAmountBrl) {
    return { kind: "amount_below_deposit", requiredBrl: booking.depositAmountBrl };
  }

  // Prazo vencido ou já expirado: só confirma se o horário ainda estiver livre.
  if (!isPaymentWindowOpen(booking, now) && (await store.hasOtherActiveBooking(booking, now))) {
    return { kind: "slot_unavailable" };
  }

  const record: ManualPaymentRecord = {
    bookingId: booking.id,
    amountBrl: input.amountBrl,
    method: input.method,
    confirmedById: staff.id,
    confirmedAt: now,
    reference: input.reference?.trim() || null,
    previousStatus: booking.status,
    newStatus: "CONFIRMED",
    idempotencyKey: input.idempotencyKey,
  };
  const event = paymentConfirmedEvent({ bookingId: booking.id, unitId: booking.unitId, source: "MANUAL" });

  try {
    const changed = await store.confirm({ fromStatuses: ["PENDING_PAYMENT", "EXPIRED"], record, event });
    if (!changed) {
      const current = await store.findBooking(booking.id);
      return { kind: "not_confirmable", status: current?.status ?? "UNKNOWN" };
    }
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      // Outra chamada com a mesma chave venceu a corrida: devolve o registro dela.
      const winner = await store.findConfirmationByIdempotencyKey(input.idempotencyKey);
      if (winner) return { kind: "already_confirmed", record: winner };
    }
    throw error;
  }

  return { kind: "confirmed", record, event };
}
