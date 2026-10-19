import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPaymentPreference } from "@/lib/mercadopago";
import { effectivePaymentDeadline, isPaymentWindowOpen } from "@/lib/bookingRules";
import { allowedChoices, amountFor } from "@/lib/paymentOptions";

// O cliente escolhe pagar o sinal ou o valor total (conforme o link permitir).
// Existe UMA cobrança em aberto por agendamento: trocar de opção atualiza a
// mesma linha de pagamento pendente.
const schema = z.object({
  bookingId: z.string(),
  choice: z.enum(["DEPOSIT", "FULL"]).default("DEPOSIT"),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { bookingId, choice } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, quote: { select: { paymentOptions: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "Este agendamento não está aguardando pagamento" },
      { status: 409 },
    );
  }
  const now = new Date();
  if (!isPaymentWindowOpen(booking, now)) {
    return NextResponse.json(
      { error: "O prazo para pagar este agendamento terminou. Peça um novo link à Afro Dreads." },
      { status: 409 },
    );
  }
  if (!allowedChoices(booking.quote?.paymentOptions).includes(choice)) {
    return NextResponse.json({ error: "Esta opção de pagamento não está disponível para este agendamento." }, { status: 400 });
  }

  const amounts = { servicePrice: Number(booking.servicePrice), depositAmount: Number(booking.depositAmount) };
  const amount = amountFor(choice, amounts);

  let preference;
  try {
    preference = await createPaymentPreference({
      bookingId: booking.id,
      serviceName: booking.service.name,
      choice,
      amount,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      expiresAt: effectivePaymentDeadline(booking),
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível iniciar o pagamento no Mercado Pago. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  // Reaproveita o registro de pagamento pendente existente (ex: cliente clicou
  // "pagar" mais de uma vez ou trocou de opção) em vez de criar outra linha.
  const existingPendingPayment = await prisma.payment.findFirst({
    where: { bookingId: booking.id, type: { in: ["DEPOSIT", "FULL"] }, mpPaymentId: null },
    orderBy: { createdAt: "desc" },
  });

  const type = choice === "FULL" ? "FULL" : "DEPOSIT";
  if (existingPendingPayment) {
    await prisma.payment.update({
      where: { id: existingPendingPayment.id },
      data: { type, amount, mpPreferenceId: preference.id },
    });
  } else {
    await prisma.payment.create({
      data: { bookingId: booking.id, type, amount, mpPreferenceId: preference.id },
    });
  }

  return NextResponse.json({
    preferenceId: preference.id,
    checkoutUrl: preference.init_point,
  });
}
