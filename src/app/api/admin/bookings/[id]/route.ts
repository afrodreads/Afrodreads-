import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const cancelSchema = z.object({ action: z.literal("cancel") });
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
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return NextResponse.json({ booking: { id: booking.id, status: booking.status } });
  }

  const existing = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!existing) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const scheduledStart = new Date(parsed.data.scheduledStart);
  const durationMs = existing.scheduledEnd.getTime() - existing.scheduledStart.getTime();
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMs);

  const conflict = await prisma.booking.findFirst({
    where: {
      id: { not: id },
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
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
