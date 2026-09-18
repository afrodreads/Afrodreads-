import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createDepositPreference } from "@/lib/mercadopago";

const schema = z.object({ bookingId: z.string() });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { service: true },
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

  const preference = await createDepositPreference({
    bookingId: booking.id,
    serviceName: booking.service.name,
    depositAmount: Number(booking.depositAmount),
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      type: "DEPOSIT",
      amount: booking.depositAmount,
      mpPreferenceId: preference.id,
    },
  });

  return NextResponse.json({
    preferenceId: preference.id,
    checkoutUrl: preference.init_point,
  });
}
