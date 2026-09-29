import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDepositRefundable } from "@/lib/pricing";
import { refundPayment } from "@/lib/mercadopago";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ booking });
  }

  const cancellationRequestedAt = new Date();
  const refundable = isDepositRefundable({
    scheduledStart: booking.scheduledStart,
    cancellationRequestedAt,
  });

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: cancellationRequestedAt,
      cancellationRefundedDeposit: refundable,
    },
  });

  // Estorno automático do sinal. Uma falha aqui não desfaz o cancelamento:
  // o pagamento continua APPROVED e o admin pode estornar manualmente.
  let depositRefunded = false;
  let refundError = false;
  if (refundable) {
    const deposit = await prisma.payment.findFirst({
      where: { bookingId: id, type: "DEPOSIT", status: "APPROVED", mpPaymentId: { not: null } },
    });
    if (deposit?.mpPaymentId) {
      try {
        await refundPayment(deposit.mpPaymentId);
        await prisma.payment.update({ where: { id: deposit.id }, data: { status: "REFUNDED" } });
        depositRefunded = true;
      } catch (error) {
        refundError = true;
        console.error("Falha ao estornar sinal", { bookingId: id, error });
      }
    }
  }

  return NextResponse.json({ booking: updated, depositRefunded, refundError });
}
