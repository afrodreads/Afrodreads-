import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDepositRefundable } from "@/lib/pricing";

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

  // O estorno em si (quando aplicável) é feito via API de Refunds do
  // Mercado Pago usando o mpPaymentId salvo no Payment do tipo DEPOSIT.
  // Deixado como próximo passo para integrar ao processo de atendimento.

  return NextResponse.json({ booking: updated, depositRefunded: refundable });
}
