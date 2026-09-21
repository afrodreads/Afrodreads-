import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/booking";

const completeQuoteSchema = z.object({
  scheduledStart: z.string().datetime(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  notes: z.string().optional(),
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

  const data = parsed.data;
  const result = await createBooking({
    serviceSlug: quote.service.slug,
    scheduledStart: new Date(data.scheduledStart),
    servicePrice: Number(quote.servicePrice),
    isOutOfTownSeason: quote.isOutOfTownSeason,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    notes: data.notes,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: "COMPLETED", completedAt: new Date(), bookingId: result.booking.id },
  });

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
