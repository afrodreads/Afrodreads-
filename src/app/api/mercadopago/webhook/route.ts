import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getMpPayment } from "@/lib/mercadopago";
import { sendBookingConfirmationEmail, sendTeamBookingNotificationEmail } from "@/lib/email";
import { mercadoPagoRefundGateway, processApprovedPaymentNow } from "@/lib/bookingStores";
import { applyMercadoPagoPayment } from "@/lib/paymentWebhook";

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
  await applyMercadoPagoPayment(payment, {
    db: prisma,
    refundGateway: mercadoPagoRefundGateway,
    processApproved: (params) => processApprovedPaymentNow(params),
    emailSenders: [
      { label: "confirmação para o cliente", send: sendBookingConfirmationEmail },
      { label: "aviso para a equipe", send: sendTeamBookingNotificationEmail },
    ],
  });

  return NextResponse.json({ received: true });
}