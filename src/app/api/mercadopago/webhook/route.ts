import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMpPayment } from "@/lib/mercadopago";
import { sendBookingConfirmationEmail, sendTeamBookingNotificationEmail } from "@/lib/email";
import { mercadoPagoRefundGateway, processApprovedPaymentNow } from "@/lib/bookingStores";
import { classifyPaidAmount } from "@/lib/paymentOptions";
import { bookingPaymentFields, resolveDuplicatePayments, type SettlementStore } from "@/lib/paymentSettlement";

// Documentação da validação de assinatura:
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks
function isValidSignature(request: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!secret || !signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key.trim(), value?.trim()];
    }),
  );
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash));
}

const settlementStore: SettlementStore = {
  async listApprovedPayments(bookingId) {
    const rows = await prisma.payment.findMany({
      where: { bookingId, type: { in: ["DEPOSIT", "FULL"] }, status: "APPROVED", mpPaymentId: { not: null } },
      select: { id: true, mpPaymentId: true, type: true },
    });
    return rows.map((row) => ({ id: row.id, mpPaymentId: row.mpPaymentId!, type: row.type === "FULL" ? "FULL" : "DEPOSIT" }));
  },
  async markPaymentRefunded(paymentId) {
    await prisma.payment.updateMany({ where: { id: paymentId, status: { not: "REFUNDED" } }, data: { status: "REFUNDED" } });
  },
};

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dataId = searchParams.get("data.id") ?? searchParams.get("id");
  const topic = searchParams.get("type") ?? searchParams.get("topic");

  if (!dataId || topic !== "payment") {
    return NextResponse.json({ received: true });
  }

  if (!isValidSignature(request, dataId)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const payment = await getMpPayment().get({ id: dataId });
  const bookingId = payment.external_reference;
  if (!bookingId) {
    return NextResponse.json({ received: true });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { servicePrice: true, depositAmount: true },
  });
  if (!booking) {
    return NextResponse.json({ received: true });
  }
  const amounts = { servicePrice: Number(booking.servicePrice), depositAmount: Number(booking.depositAmount) };

  const statusMap: Record<string, "APPROVED" | "REJECTED" | "PENDING" | "CANCELLED" | "REFUNDED"> = {
    approved: "APPROVED",
    rejected: "REJECTED",
    pending: "PENDING",
    in_process: "PENDING",
    cancelled: "CANCELLED",
    refunded: "REFUNDED",
  };
  const mappedStatus = statusMap[payment.status ?? ""] ?? "PENDING";

  const methodMap: Record<string, "PIX" | "CREDIT_CARD" | "BOLETO"> = {
    pix: "PIX",
    credit_card: "CREDIT_CARD",
    ticket: "BOLETO",
  };
  const mappedMethod = methodMap[payment.payment_type_id ?? ""];

  // Sinal ou valor total: decidido pelo VALOR pago (o cliente pode ter trocado
  // de opção depois de abrir a cobrança anterior).
  const mpPaymentId = String(payment.id);
  const paidAmount = Number(payment.transaction_amount ?? 0);
  const paidChoice = classifyPaidAmount(paidAmount, amounts);

  // Um único registro por pagamento do Mercado Pago (mpPaymentId é único).
  // Sem registro desse pagamento: usa a linha pendente do agendamento ou cria uma.
  const paymentRecord =
    (await prisma.payment.findUnique({ where: { mpPaymentId } })) ??
    (await prisma.payment.findFirst({
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
    rawWebhookPayload: payment as unknown as object,
    ...(paidAmount > 0 ? { amount: paidAmount } : {}),
  };

  if (paymentRecord) {
    await prisma.payment.update({ where: { id: paymentRecord.id }, data });
  } else {
    try {
      await prisma.payment.create({ data: { ...data, bookingId, amount: paidAmount } });
    } catch (error) {
      // Dois webhooks simultâneos do mesmo pagamento: o outro já gravou.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }

  if (mappedStatus !== "APPROVED" || keepRefunded) {
    return NextResponse.json({ received: true });
  }

  // Pagou duas vezes (ex.: sinal e total)? Fica o primeiro, o resto é estornado.
  const resolution = await resolveDuplicatePayments(bookingId, settlementStore, mercadoPagoRefundGateway);
  const self = await prisma.payment.findUnique({ where: { mpPaymentId }, select: { id: true } });
  if (self && (resolution.refunded.includes(self.id) || resolution.failed.includes(self.id))) {
    console.error("Pagamento em duplicidade estornado", { bookingId, mpPaymentId, refundFailed: resolution.failed.includes(self.id) });
    return NextResponse.json({ received: true });
  }

  // Só confirma quem ainda está pendente: webhooks repetidos não reenviam o
  // e-mail e um "approved" atrasado não reativa um agendamento cancelado.
  // Pagamento aprovado depois do prazo: reconfirma se o horário ainda cabe na
  // agenda; se não, estorna (ver paymentProcessing).
  const outcome = await processApprovedPaymentNow({ bookingId, mpPaymentId });

  if (outcome === "refunded" || outcome === "refund_failed") {
    console.error("Pagamento aprovado para um horário que já não está disponível", {
      bookingId,
      mpPaymentId,
      outcome,
    });
    return NextResponse.json({ received: true });
  }

  // O agendamento passa a mostrar o que ficou pago (sinal ou total).
  if (resolution.keeper) {
    await prisma.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: bookingPaymentFields(resolution.keeper.type, amounts),
    });
  }

  if (outcome === "confirmed" || outcome === "reconfirmed") {
    const confirmed = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (confirmed) {
      // Uma falha no envio do e-mail não pode derrubar o webhook — o
      // Mercado Pago reenvia webhooks com erro, o que reprocessaria o
      // pagamento à toa. Os dois e-mails são independentes.
      const emails = [
        { label: "confirmação para o cliente", send: sendBookingConfirmationEmail },
        { label: "aviso para a equipe", send: sendTeamBookingNotificationEmail },
      ];
      for (const { label, send } of emails) {
        try {
          await send(confirmed);
        } catch (emailError) {
          console.error(`Falha ao enviar e-mail de ${label}`, {
            bookingId: confirmed.id,
            error: emailError,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
