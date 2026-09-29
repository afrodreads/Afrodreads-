import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail } from "@/lib/email";

// Vercel adiciona automaticamente o header Authorization com o valor de
// CRON_SECRET nas chamadas do cron job (ver vercel.json). Isso impede que
// qualquer pessoa dispare o envio de e-mails só conhecendo a URL da rota.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Janela de segurança: evita reprocessar/spammar agendamentos muito antigos
  // caso o cron fique fora do ar por alguns dias.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      scheduledEnd: { lte: oneDayAgo, gt: sevenDaysAgo },
      reviewRequest: null,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await sendReviewRequestEmail(booking);
      // bookingId é a chave primária: só grava depois do envio confirmado,
      // assim uma falha aqui faz o próximo cron tentar de novo naturalmente
      // (a linha simplesmente não existe ainda).
      await prisma.reviewRequest.create({ data: { bookingId: booking.id } });
      sent += 1;
    } catch (error) {
      console.error(`Falha ao enviar pedido de avaliação (booking ${booking.id}):`, error);
      failed += 1;
    }
  }

  return NextResponse.json({ checked: bookings.length, sent, failed });
}
