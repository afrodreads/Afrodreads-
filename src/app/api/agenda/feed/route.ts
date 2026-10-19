import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcs, isValidFeedToken } from "@/lib/calendarFeed";

// Feed iCalendar privado dos agendamentos CONFIRMADOS, para assinar no Google
// Agenda ("Adicionar agenda → De URL"). O Google não faz login: o acesso é pelo
// token secreto no endereço (mostrado só no painel do admin).
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!isValidFeedToken(token, process.env.ADMIN_SESSION_SECRET)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      scheduledStart: { gte: new Date(now.getTime() - 60 * DAY_MS), lt: new Date(now.getTime() + 550 * DAY_MS) },
    },
    orderBy: { scheduledStart: "asc" },
    include: { service: { select: { name: true } } },
  });

  const ics = buildIcs(
    bookings.map((booking) => ({
      id: booking.id,
      serviceName: booking.service.name,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      paymentOption: booking.paymentOption,
      remainingAmount: Number(booking.remainingAmount),
      forced: booking.forced,
      notes: booking.notes,
      updatedAt: booking.updatedAt,
    })),
    now,
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="afrodreads-agenda.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
