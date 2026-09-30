import { z } from "zod";
import { InvalidInputError, UniqueConflictError } from "../conversations/errors";
import { paymentDeadline } from "../bookingRules";
import { assertStaff, type StaffActor } from "./actors";

// "Estender prazo de pagamento": ação humana para quando a equipe combinou um
// horário pelo WhatsApp e aguarda o comprovante. A regra geral de 60 minutos
// continua valendo para todos os outros agendamentos; aqui só se registra uma
// exceção, por agendamento, com responsável, motivo e novo prazo.
//
// Só uma pessoa autorizada executa (a IA não tem ferramenta para isto e o
// serviço recusa qualquer ator que não seja STAFF). Nada é estendido por
// automação.
//
// Integração futura (depende de tabela nova, ver relatório): a agenda
// (`activeBookingWhere`) e a expiração diária precisam respeitar o prazo
// efetivo. Os helpers abaixo já definem esse cálculo, testado.

export const MAX_EXTENSION_HOURS = 72;
export const MIN_REASON_LENGTH = 10;

const HOUR_MS = 60 * 60 * 1000;

export type PaymentHoldRecord = {
  bookingId: string;
  extendedBy: string;
  extendedAt: Date;
  reason: string;
  previousDeadline: Date;
  newDeadline: Date;
  idempotencyKey: string;
};

export type PaymentHoldBooking = {
  id: string;
  status: string;
  createdAt: Date;
  scheduledStart: Date;
};

export interface PaymentHoldStore {
  findBooking(bookingId: string): Promise<PaymentHoldBooking | null>;
  latestHold(bookingId: string): Promise<PaymentHoldRecord | null>;
  findByIdempotencyKey(key: string): Promise<PaymentHoldRecord | null>;
  /** Grava o registro; lança UniqueConflictError se a chave de idempotência já existe. */
  record(hold: PaymentHoldRecord): Promise<void>;
}

/** Prazo efetivo: o maior entre a regra geral e a última extensão da equipe. */
export function effectivePaymentDeadline(
  booking: { createdAt: Date },
  latestHold: { newDeadline: Date } | null,
): Date {
  const general = paymentDeadline(booking.createdAt);
  if (!latestHold) return general;
  return latestHold.newDeadline.getTime() > general.getTime() ? latestHold.newDeadline : general;
}

export function isPaymentWindowOpenWithHold(
  booking: { status: string; createdAt: Date },
  latestHold: { newDeadline: Date } | null,
  now: Date,
): boolean {
  return (
    booking.status === "PENDING_PAYMENT" &&
    effectivePaymentDeadline(booking, latestHold).getTime() > now.getTime()
  );
}

const inputSchema = z.object({
  bookingId: z.string().min(1).max(64),
  newDeadline: z.date(),
  reason: z.string().trim().min(MIN_REASON_LENGTH).max(300),
  idempotencyKey: z.string().min(8).max(100),
});

export type ExtendPaymentDeadlineInput = z.input<typeof inputSchema>;

export type ExtendPaymentDeadlineResult =
  | { kind: "extended"; record: PaymentHoldRecord }
  | { kind: "already_extended"; record: PaymentHoldRecord }
  | { kind: "not_found" }
  | { kind: "not_extendable"; status: string }
  | {
      kind: "invalid_deadline";
      reason: "not_in_future" | "not_after_current" | "too_far" | "after_appointment";
    };

export async function extendPaymentDeadline(
  store: PaymentHoldStore,
  params: { actor: StaffActor; input: ExtendPaymentDeadlineInput; now?: Date },
): Promise<ExtendPaymentDeadlineResult> {
  assertStaff(params.actor);

  const parsed = inputSchema.safeParse(params.input);
  if (!parsed.success || Number.isNaN(parsed.data.newDeadline.getTime())) {
    throw new InvalidInputError("Dados da extensão de prazo inválidos (o motivo é obrigatório).");
  }
  const input = parsed.data;
  const now = params.now ?? new Date();

  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (existing.bookingId !== input.bookingId) {
      throw new InvalidInputError("Esta chave de idempotência já foi usada em outro agendamento.");
    }
    return { kind: "already_extended", record: existing };
  }

  const booking = await store.findBooking(input.bookingId);
  if (!booking) return { kind: "not_found" };
  // Só estende quem ainda está aguardando pagamento. Expirado/cancelado/confirmado não.
  if (booking.status !== "PENDING_PAYMENT") return { kind: "not_extendable", status: booking.status };

  const current = effectivePaymentDeadline(booking, await store.latestHold(booking.id));

  if (input.newDeadline.getTime() <= now.getTime()) return { kind: "invalid_deadline", reason: "not_in_future" };
  if (input.newDeadline.getTime() <= current.getTime()) {
    return { kind: "invalid_deadline", reason: "not_after_current" };
  }
  if (input.newDeadline.getTime() > now.getTime() + MAX_EXTENSION_HOURS * HOUR_MS) {
    return { kind: "invalid_deadline", reason: "too_far" };
  }
  if (input.newDeadline.getTime() >= booking.scheduledStart.getTime()) {
    return { kind: "invalid_deadline", reason: "after_appointment" };
  }

  const record: PaymentHoldRecord = {
    bookingId: booking.id,
    extendedBy: params.actor.userId.trim(),
    extendedAt: now,
    reason: input.reason,
    previousDeadline: current,
    newDeadline: input.newDeadline,
    idempotencyKey: input.idempotencyKey,
  };

  try {
    await store.record(record);
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      const winner = await store.findByIdempotencyKey(input.idempotencyKey);
      if (winner) return { kind: "already_extended", record: winner };
    }
    throw error;
  }

  return { kind: "extended", record };
}
