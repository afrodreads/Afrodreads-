import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cancelBookingById } from "@/lib/bookingStores";
import { checkAdd, REJECTION_LABEL } from "@/lib/capacity/engine";
import { loadDayBookings, loadRuleBook, lockAgendaDay } from "@/lib/capacity/store";
import { offeredPeriod, periodOfStart } from "@/lib/schedule";
import { saoPauloDateKey, saoPauloDayAsUtcMidnight } from "@/lib/timezone";

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
  // Só administradores (rota /api/admin/*): remarcar fora das regras de capacidade.
  force: z.boolean().optional(),
  reason: z.string().trim().max(300).optional(),
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
      partialRefundAmount: result.partialRefundAmount,
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

  const force = parsed.data.force === true;
  const reason = parsed.data.reason?.trim() || null;
  if (force && (reason ?? "").length < 5) {
    return NextResponse.json({ error: "Explique o motivo do encaixe fora das regras (mínimo 5 letras)." }, { status: 400 });
  }

  const scheduledStart = new Date(parsed.data.scheduledStart);
  const period = force ? periodOfStart(scheduledStart) : offeredPeriod(scheduledStart);
  if (!period || scheduledStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Escolha um horário futuro da agenda (10h ou 15h)." }, { status: 400 });
  }
  const durationMs = existing.scheduledEnd.getTime() - existing.scheduledStart.getTime();
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMs);

  // Mesma regra de capacidade da reserva, com a agenda do dia travada.
  const outcome = await prisma.$transaction(
    async (tx) => {
      const day = saoPauloDayAsUtcMidnight(scheduledStart);
      await lockAgendaDay(tx, saoPauloDateKey(scheduledStart));
      if (!force) {
        const blocked = await tx.blockedDate.findUnique({ where: { date: day } });
        if (blocked?.fullDay) return { ok: false as const, detail: "Dia bloqueado" };
        const [rules, dayBookings] = await Promise.all([loadRuleBook(tx), loadDayBookings(tx, day, new Date(), id)]);
        const check = checkAdd(rules, dayBookings, existing.serviceId, period);
        if (!check.ok) return { ok: false as const, detail: REJECTION_LABEL[check.reason] };
      }
      const updated = await tx.booking.update({
        where: { id },
        data: {
          scheduledStart,
          scheduledEnd,
          period,
          ...(force ? { forced: true, forcedReason: reason } : {}),
        },
      });
      return { ok: true as const, booking: updated };
    },
    { timeout: 15_000 },
  );

  if (!outcome.ok) {
    return NextResponse.json(
      { error: `Horário indisponível. Motivo: ${outcome.detail}. Para remarcar mesmo assim, use "forçar encaixe".` },
      { status: 409 },
    );
  }
  const booking = outcome.booking;

  return NextResponse.json({
    booking: {
      id: booking.id,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
    },
  });
}
