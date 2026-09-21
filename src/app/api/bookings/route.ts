import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking";

const createBookingSchema = z.object({
  serviceSlug: z.string(),
  scheduledStart: z.string().datetime(),
  servicePrice: z.number().positive(),
  isOutOfTownSeason: z.boolean().default(false),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = createBookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await createBooking({
    serviceSlug: data.serviceSlug,
    scheduledStart: new Date(data.scheduledStart),
    servicePrice: data.servicePrice,
    isOutOfTownSeason: data.isOutOfTownSeason,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    notes: data.notes,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
