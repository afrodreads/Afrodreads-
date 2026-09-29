import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Rodada diária (ver vercel.json): pede avaliação no Google aos clientes
// atendidos ontem. Só vai para agendamentos CONFIRMED/COMPLETED que terminaram
// antes de hoje (fuso de São Paulo) e nos últimos 3 dias, para não disparar
// e-mails sobre atendimentos antigos. Cada agendamento recebe no máximo um
// pedido: o registro em ReviewRequest é criado ANTES do envio e é a trava.
const LOOKBACK_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Início do dia de hoje em São Paulo (UTC-3, sem horário de verão desde 2019).
export function startOfTodaySaoPaulo(now: Date): Date {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${day}T00:00:00-03:00`);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Sem CRON_SECRET configurado a rota fica fechada (falha segura).
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const before = startOfTodaySaoPaulo(new Date());
  const after = new Date(before.getTime() - LOOKBACK_DAYS * DAY_MS);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      scheduledEnd: { gte: after, lt: before },
      reviewRequest: null,
    },
    include: { service: true },
  });

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      // Trava: a chave primária impede dois envios para o mesmo agendamento.
      await prisma.reviewRequest.create({ data: { bookingId: booking.id } });
    } catch {
      continue; // já reservado por outra execução
    }

    try {
      await sendReviewRequestEmail(booking);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Falha ao enviar pedido de avaliação:", booking.id, error);
      // Libera para uma nova tentativa na próxima rodada (ainda dentro da janela).
      await prisma.reviewRequest.delete({ where: { bookingId: booking.id } }).catch(() => {});
    }
  }

  return NextResponse.json({ checked: bookings.length, sent, failed });
}
