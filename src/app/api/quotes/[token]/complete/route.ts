import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/booking";
import { linkBookingToCustomerBestEffort } from "@/lib/conversations/wiring";

const completeQuoteSchema = z.object({
  scheduledStart: z.string().datetime(),
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email().max(200),
  clientPhone: z.string().min(8).max(30),
  notes: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = completeQuoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({ where: { token }, include: { service: true } });
  if (!quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }
  if (quote.status !== "SENT" && quote.status !== "OPENED") {
    return NextResponse.json(
      { error: "Este orçamento não está mais disponível." },
      { status: 409 },
    );
  }
  if (quote.expiresAt < new Date()) {
    return NextResponse.json({ error: "Este link expirou." }, { status: 409 });
  }

  // O link é de uso único: "consumimos" o orçamento de forma atômica ANTES de
  // criar o agendamento. Duas requisições simultâneas com o mesmo token não
  // passam as duas (só uma vê count > 0).
  const now = new Date();
  const claim = await prisma.quote.updateMany({
    where: { id: quote.id, status: { in: ["SENT", "OPENED"] }, expiresAt: { gt: now } },
    data: { status: "COMPLETED", completedAt: now },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "Este orçamento não está mais disponível." },
      { status: 409 },
    );
  }

  // Se a criação do agendamento falhar (horário indisponível, erro...), o
  // orçamento volta ao estado anterior para o cliente poder tentar de novo.
  const releaseQuote = () =>
    prisma.quote.updateMany({
      where: { id: quote.id, status: "COMPLETED", bookingId: null },
      data: { status: quote.status, completedAt: null },
    });

  const data = parsed.data;
  let result;
  try {
    // O valor do serviço vem SEMPRE do orçamento gravado no banco.
    result = await createBooking({
      serviceSlug: quote.service.slug,
      scheduledStart: new Date(data.scheduledStart),
      servicePrice: Number(quote.servicePrice),
      isOutOfTownSeason: quote.isOutOfTownSeason,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      notes: data.notes,
    });
  } catch (error) {
    await releaseQuote();
    throw error;
  }

  if ("error" in result) {
    await releaseQuote();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { bookingId: result.booking.id },
  });

  // Relaciona o agendamento ao cliente (por telefone). Melhor esforço: nunca
  // impede nem atrasa a confirmação do agendamento já criado.
  await linkBookingToCustomerBestEffort(result.booking.id);

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
