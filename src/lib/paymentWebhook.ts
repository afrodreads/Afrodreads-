import { Prisma, type Booking, type PrismaClient, type Service } from "@prisma/client";
import type { RefundGateway } from "./cancellation";
import { classifyPaidAmount } from "./paymentOptions";
import type { ApprovedPaymentOutcome } from "./paymentProcessing";
import { bookingPaymentFields, resolveDuplicatePayments, type SettlementStore } from "./paymentSettlement";

// Regra do webhook do Mercado Pago depois que a assinatura foi validada e o
// pagamento foi lido da API: grava o pagamento (sinal ou total, decidido pelo
// valor), estorna duplicidades, confirma o agendamento e avisa por e-mail. Fica
// fora da rota para ser testado com banco de verdade e sem chamar o Mercado Pago.

/** O que usamos do pagamento devolvido pela API do Mercado Pago. */
export type MercadoPagoPayment = {
  id?: number | string | null;
  status?: string | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
  payment_type_id?: string | null;
  installments?: number | null;
};

export type BookingWithService = Booking & { service: Service };

export type EmailSender = { label: string; send: (booking: BookingWithService) => Promise<unknown> };

export interface PaymentWebhookDeps {
  db: PrismaClient;
  refundGateway: Pick<RefundGateway, "refund">;
  processApproved(params: { bookingId: string; mpPaymentId: string }): Promise<ApprovedPaymentOutcome>;
  emailSenders: EmailSender[];
}

export type PaymentWebhookResult =
  | "no_booking" // pagamento sem agendamento conhecido
  | "recorded" // gravado; não é um pagamento aprovado (ou já estava estornado)
  | "duplicate_refunded" // este pagamento era a duplicidade e foi estornado
  | "late_refunded" // aprovado fora do prazo e o horário já não existe: estornado
  | "confirmed" // agendamento confirmado agora (e-mails enviados)
  | "reconfirmed" // pagamento atrasado, horário livre: reconfirmado (e-mails enviados)
  | "settled"; // nada novo a confirmar (webhook repetido); campos de pagamento conferidos

const STATUS_MAP: Record<string, "APPROVED" | "REJECTED" | "PENDING" | "CANCELLED" | "REFUNDED"> = {
  approved: "APPROVED",
  rejected: "REJECTED",
  pending: "PENDING",
  in_process: "PENDING",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

const METHOD_MAP: Record<string, "PIX" | "CREDIT_CARD" | "BOLETO"> = {
  pix: "PIX",
  credit_card: "CREDIT_CARD",
  ticket: "BOLETO",
};

function settlementStoreFor(db: PrismaClient): SettlementStore {
  return {
    async listApprovedPayments(bookingId) {
      const rows = await db.payment.findMany({
        where: { bookingId, type: { in: ["DEPOSIT", "FULL"] }, status: "APPROVED", mpPaymentId: { not: null } },
        select: { id: true, mpPaymentId: true, type: true },
      });
      return rows.map((row) => ({
        id: row.id,
        mpPaymentId: row.mpPaymentId!,
        type: row.type === "FULL" ? ("FULL" as const) : ("DEPOSIT" as const),
      }));
    },
    async markPaymentRefunded(paymentId) {
      await db.payment.updateMany({ where: { id: paymentId, status: { not: "REFUNDED" } }, data: { status: "REFUNDED" } });
    },
  };
}

export async function applyMercadoPagoPayment(
  payment: MercadoPagoPayment,
  deps: PaymentWebhookDeps,
): Promise<PaymentWebhookResult> {
  const { db } = deps;
  const bookingId = payment.external_reference;
  if (!bookingId || payment.id === undefined || payment.id === null) return "no_booking";

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { servicePrice: true, depositAmount: true },
  });
  if (!booking) return "no_booking";
  const amounts = { servicePrice: Number(booking.servicePrice), depositAmount: Number(booking.depositAmount) };

  const mappedStatus = STATUS_MAP[payment.status ?? ""] ?? "PENDING";
  const mappedMethod = METHOD_MAP[payment.payment_type_id ?? ""];

  // Sinal ou valor total: decidido pelo VALOR pago (o cliente pode ter trocado
  // de opção depois de abrir a cobrança anterior).
  const mpPaymentId = String(payment.id);
  const paidAmount = Number(payment.transaction_amount ?? 0);
  const paidChoice = classifyPaidAmount(paidAmount, amounts);

  // Um único registro por pagamento do Mercado Pago (mpPaymentId é único).
  // Sem registro desse pagamento: usa a linha pendente do agendamento ou cria uma.
  const paymentRecord =
    (await db.payment.findUnique({ where: { mpPaymentId } })) ??
    (await db.payment.findFirst({
      where: { bookingId, type: { in: ["DEPOSIT", "FULL"] }, mpPaymentId: null },
      orderBy: { createdAt: "desc" },
    }));

  // Um pagamento já estornado por nós nunca volta a "aprovado" por causa de
  // um webhook repetido ou fora de ordem.
  const keepRefunded = paymentRecord?.status === "REFUNDED" && mappedStatus === "APPROVED";
  const data = {
    mpPaymentId,
    type: paidChoice,
    status: keepRefunded ? ("REFUNDED" as const) : mappedStatus,
    method: mappedMethod,
    installments: payment.installments ?? undefined,
    rawWebhookPayload: payment as unknown as Prisma.InputJsonValue,
    ...(paidAmount > 0 ? { amount: paidAmount } : {}),
  };

  if (paymentRecord) {
    await db.payment.update({ where: { id: paymentRecord.id }, data });
  } else {
    try {
      await db.payment.create({ data: { ...data, bookingId, amount: paidAmount } });
    } catch (error) {
      // Dois webhooks simultâneos do mesmo pagamento: o outro já gravou.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }

  if (mappedStatus !== "APPROVED" || keepRefunded) return "recorded";

  // Pagou duas vezes (ex.: sinal e total)? Fica o valor total (ou o primeiro,
  // se forem do mesmo tipo); o resto é estornado.
  const resolution = await resolveDuplicatePayments(bookingId, settlementStoreFor(db), deps.refundGateway);
  const self = await db.payment.findUnique({ where: { mpPaymentId }, select: { id: true } });
  if (self && (resolution.refunded.includes(self.id) || resolution.failed.includes(self.id))) {
    console.error("Pagamento em duplicidade estornado", {
      bookingId,
      mpPaymentId,
      refundFailed: resolution.failed.includes(self.id),
    });
    return "duplicate_refunded";
  }

  // Só confirma quem ainda está pendente: webhooks repetidos não reenviam o
  // e-mail e um "approved" atrasado não reativa um agendamento cancelado.
  // Pagamento aprovado depois do prazo: reconfirma se o horário ainda cabe na
  // agenda; se não, estorna (ver paymentProcessing).
  const outcome = await deps.processApproved({ bookingId, mpPaymentId });

  if (outcome === "refunded" || outcome === "refund_failed") {
    console.error("Pagamento aprovado para um horário que já não está disponível", { bookingId, mpPaymentId, outcome });
    return "late_refunded";
  }

  // O agendamento passa a mostrar o que ficou pago (sinal ou total).
  if (resolution.keeper) {
    await db.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: bookingPaymentFields(resolution.keeper.type, amounts),
    });
  }

  if (outcome !== "confirmed" && outcome !== "reconfirmed") return "settled";

  const confirmed = await db.booking.findUnique({ where: { id: bookingId }, include: { service: true } });
  if (confirmed) {
    // Uma falha no envio do e-mail não pode derrubar o webhook — o Mercado
    // Pago reenvia webhooks com erro, o que reprocessaria o pagamento à toa.
    // Os e-mails são independentes.
    for (const { label, send } of deps.emailSenders) {
      try {
        await send(confirmed);
      } catch (emailError) {
        console.error(`Falha ao enviar e-mail de ${label}`, { bookingId: confirmed.id, error: emailError });
      }
    }
  }
  return outcome;
}
