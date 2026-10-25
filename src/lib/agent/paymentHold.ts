import { z } from "zod";
import { InvalidInputError, UniqueConflictError } from "../conversations/errors";
import { effectivePaymentDeadline } from "../bookingRules";
import { authorizeStaff, type StaffActor, type StaffDirectory } from "./actors";

// "Estender prazo de pagamento": ação HUMANA para quando a equipe combinou um
// horário pelo WhatsApp e aguarda o comprovante. A regra geral de 60 minutos
// continua valendo para todos os outros agendamentos.
//
// O novo prazo vai para Booking.paymentDueAt (a agenda e a expiração diária já
// respeitam, ver bookingRules.ts) e cada extensão vira uma linha de auditoria
// (PaymentHold). A IA não tem ferramenta para isto e o serviço só aceita uma
// pessoa autorizada da equipe.

/** Política configurável (um lugar só; nada de números espalhados). */
export type PaymentHoldPolicy = {
  /** Até quantas horas a partir de agora o prazo pode ir. */
  maxExtensionHours: number;
  /** Tamanho mínimo do motivo. */
  minReasonLength: number;
};

export const DEFAULT_PAYMENT_HOLD_POLICY: PaymentHoldPolicy = Object.freeze({
  maxExtensionHours: 72,
  minReasonLength: 10,
});

const HOUR_MS = 60 * 60 * 1000;

export type PaymentHoldRecord = {
  bookingId: string;
  previousDeadline: Date;
  newDeadline: Date;
  reason: string;
  extendedById: string;
  extendedAt: Date;
  idempotencyKey: string;
};

export type PaymentHoldBooking = {
  id: string;
  status: string;
  unitId: string | null;
  createdAt: Date;
  scheduledStart: Date;
  paymentDueAt: Date | null;
};

export interface PaymentHoldStore extends StaffDirectory {
  findBooking(bookingId: string): Promise<PaymentHoldBooking | null>;
  findHoldByIdempotencyKey(key: string): Promise<PaymentHoldRecord | null>;
  /**
   * Em UMA transação: grava `paymentDueAt = record.newDeadline` só se o
   * agendamento ainda estiver PENDING_PAYMENT e com o `paymentDueAt` esperado,
   * e grava a auditoria. false = mudou no meio do caminho. Lança
   * UniqueConflictError se a chave de idempotência já existe.
   */
  applyHold(args: { expectedDueAt: Date | null; record: PaymentHoldRecord }): Promise<boolean>;
}

export type ExtendPaymentDeadlineInput = {
  bookingId: string;
  newDeadline: Date;
  reason: string;
  idempotencyKey: string;
};

export type ExtendPaymentDeadlineResult =
  | { kind: "extended"; record: PaymentHoldRecord }
  | { kind: "already_extended"; record: PaymentHoldRecord }
  | { kind: "not_found" }
  | { kind: "not_extendable"; status: string }
  | { kind: "conflict" }
  | {
      kind: "invalid_deadline";
      reason: "not_in_future" | "not_after_current" | "too_far" | "after_appointment";
    };

export async function extendPaymentDeadline(
  store: PaymentHoldStore,
  params: {
    actor: StaffActor;
    input: ExtendPaymentDeadlineInput;
    now?: Date;
    policy?: PaymentHoldPolicy;
  },
): Promise<ExtendPaymentDeadlineResult> {
  const policy = params.policy ?? DEFAULT_PAYMENT_HOLD_POLICY;
  const schema = z.object({
    bookingId: z.string().min(1).max(64),
    newDeadline: z.date().refine((date) => !Number.isNaN(date.getTime())),
    reason: z.string().trim().min(policy.minReasonLength).max(300),
    idempotencyKey: z.string().min(8).max(100),
  });
  const parsed = schema.safeParse(params.input);
  if (!parsed.success) {
    throw new InvalidInputError("Dados da extensão de prazo inválidos (o motivo é obrigatório).");
  }
  const input = parsed.data;
  const now = params.now ?? new Date();

  const booking = await store.findBooking(input.bookingId);
  // Autoriza ANTES de revelar qualquer coisa (inclusive se já foi estendido).
  const staff = await authorizeStaff(store, params.actor, "EXTEND_PAYMENT_DEADLINE", {
    unitId: booking?.unitId ?? null,
  });

  const existing = await store.findHoldByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (existing.bookingId !== input.bookingId) {
      throw new InvalidInputError("Esta chave de idempotência já foi usada em outro agendamento.");
    }
    return { kind: "already_extended", record: existing };
  }

  if (!booking) return { kind: "not_found" };
  if (booking.status !== "PENDING_PAYMENT") return { kind: "not_extendable", status: booking.status };

  const current = effectivePaymentDeadline(booking);
  const target = input.newDeadline.getTime();
  if (target <= now.getTime()) return { kind: "invalid_deadline", reason: "not_in_future" };
  if (target <= current.getTime()) return { kind: "invalid_deadline", reason: "not_after_current" };
  if (target > now.getTime() + policy.maxExtensionHours * HOUR_MS) {
    return { kind: "invalid_deadline", reason: "too_far" };
  }
  if (target >= booking.scheduledStart.getTime()) return { kind: "invalid_deadline", reason: "after_appointment" };

  const record: PaymentHoldRecord = {
    bookingId: booking.id,
    previousDeadline: current,
    newDeadline: input.newDeadline,
    reason: input.reason,
    extendedById: staff.id,
    extendedAt: now,
    idempotencyKey: input.idempotencyKey,
  };

  try {
    const applied = await store.applyHold({ expectedDueAt: booking.paymentDueAt, record });
    if (!applied) return { kind: "conflict" };
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      const winner = await store.findHoldByIdempotencyKey(input.idempotencyKey);
      if (winner) return { kind: "already_extended", record: winner };
    }
    throw error;
  }

  return { kind: "extended", record };
}
