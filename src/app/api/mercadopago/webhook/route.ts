import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getMpPayment } from "@/lib/mercadopago";
import { sendBookingConfirmationEmail, sendTeamBookingNotificationEmail } from "@/lib/email";

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

  // Atualiza um único registro (nunca updateMany): mpPaymentId é único, então
  // duas linhas DEPOSIT pendentes para o mesmo agendamento (ex: cliente clicou
  // "pagar" mais de uma vez antes da limpeza em create-preference) fariam o
  // updateMany quebrar com "Unique constraint failed" ao gravar o mesmo valor
  // nas duas ao mesmo tempo.
  const paymentRecord = await prisma.payment.findFirst({
    where: {
      bookingId,
      type: "DEPOSIT",
      OR: [{ mpPaymentId: null }, { mpPaymentId: String(payment.id) }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (paymentRecord) {
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        mpPaymentId: String(payment.id),
        status: mappedStatus,
        method: mappedMethod,
        installments: payment.installments ?? undefined,
        rawWebhookPayload: payment as unknown as object,
      },
    });
  }

  if (mappedStatus === "APPROVED") {
    // Só confirma quem ainda está pendente: webhooks repetidos não reenviam o
    // e-mail e um "approved" atrasado não reativa um agendamento cancelado.
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED" },
    });

    if (count > 0) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true },
      });
      if (booking) {
        // Uma falha no envio do e-mail não pode derrubar o webhook — o
        // Mercado Pago reenvia webhooks com erro, o que reprocessaria o
        // pagamento à toa. Os dois e-mails são independentes: se um falhar,
        // o outro ainda sai.
        const emails = [
          { label: "confirmação para o cliente", send: sendBookingConfirmationEmail },
          { label: "aviso para a equipe", send: sendTeamBookingNotificationEmail },
        ];
        for (const { label, send } of emails) {
          try {
            await send(booking);
          } catch (emailError) {
            console.error(`Falha ao enviar e-mail de ${label}`, {
              bookingId: booking.id,
              error: emailError,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
