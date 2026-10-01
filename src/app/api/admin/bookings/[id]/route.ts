import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { activeBookingWhere } from "@/lib/bookingRules";
import { cancelBookingById } from "@/lib/bookingStores";

// `initiatedBy`: quem pediu o cancelamento. "client" (padrão) aplica a regra
// de devolução do sinal (2 dias ou mais). "studio" é para quando o estúdio não
// pode atender e sempre devolve o sinal.
const cancelSchema = z.object({
  action: z.literal("cancel"),
  initiatedBy: z.enum(["client", "studio"]).optional(),
});
const rescheduleSchema = z.object({
  action: z.literal("reschedule"),
  scheduledStart: z.string().datetime(),
});
const schema = z.discriminatedUnion("action", [cancelSchema, rescheduleSchema]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "cancel") {
    const result = await cancelBookingById(id, parsed.data.initiatedBy ?? "client");

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    if (result.kind === "not_cancellable") {
      return NextResponse.json(
        { error: "Este agendamento não pode mais ser cancelado." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      booking: { id: result.booking.id, status: result.booking.status },
      depositRefunded: result.depositRefunded,
      refundError: result.refundError,
    });
  }

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (existing.status !== "PENDING_PAYMENT" && existing.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Este agendamento não pode mais ser reagendado." },
      { status: 409 },
    );
  }

  const scheduledStart = new Date(parsed.data.scheduledStart);
  const durationMs = existing.scheduledEnd.getTime() - existing.scheduledStart.getTime();
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMs);

  const conflict = await prisma.booking.findFirst({
    where: {
      AND: [
        { id: { not: id } },
        activeBookingWhere(new Date()),
        { scheduledStart: { lt: scheduledEnd }, scheduledEnd: { gt: scheduledStart } },
      ],
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Horário indisponível. Escolha outro horário." },
      { status: 409 },
    );
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { scheduledStart, scheduledEnd },
  });

  return NextResponse.json({
    booking: {
      id: booking.id,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
    },
  });
}
