import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking";
import { REJECTION_LABEL, type Rejection } from "@/lib/capacity/engine";
import { linkBookingToCustomerBestEffort } from "@/lib/conversations/wiring";
import { periodStart } from "@/lib/schedule";
import { parseDateKey } from "@/lib/timezone";

// Encaixe manual pelo painel (só administradores: /api/admin/* exige o login
// do admin no proxy). Com `force`, ignora as regras de capacidade e o bloqueio
// do dia; o motivo fica gravado no agendamento.
const schema = z
  .object({
    serviceSlug: z.string().min(1),
    date: z.string(),
    period: z.enum(["MORNING", "AFTERNOON"]),
    clientName: z.string().trim().min(2).max(120),
    clientEmail: z.string().trim().email().max(200),
    clientPhone: z.string().trim().min(8).max(30),
    servicePrice: z.number().positive(),
    isOutOfTownSeason: z.boolean().default(false),
    status: z.enum(["PENDING_PAYMENT", "CONFIRMED"]),
    force: z.boolean().default(false),
    reason: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => !value.force || (value.reason ?? "").length >= 5, {
    message: "Explique o motivo do encaixe fora das regras (mínimo 5 letras).",
    path: ["reason"],
  });

const REASON_LABEL: Record<string, string> = {
  ...REJECTION_LABEL,
  blocked_day: "Dia bloqueado",
  outside_grid: "Fora da grade (dia fechado ou horário diferente de 10h/15h)",
};

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;
  const day = parseDateKey(data.date);
  if (!day) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

  const result = await createBooking({
    serviceSlug: data.serviceSlug,
    scheduledStart: periodStart(day, data.period),
    servicePrice: data.servicePrice,
    isOutOfTownSeason: data.isOutOfTownSeason,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    notes: data.notes,
    admin: { force: data.force, reason: data.reason ?? null, status: data.status },
  });

  if ("error" in result) {
    const detail = result.reason ? REASON_LABEL[result.reason as Rejection] ?? result.reason : null;
    return NextResponse.json(
      { error: detail ? `${result.error} Motivo: ${detail}. Para encaixar mesmo assim, marque "forçar encaixe".` : result.error },
      { status: result.status },
    );
  }

  await linkBookingToCustomerBestEffort(result.booking.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.json(
    {
      booking: { id: result.booking.id, status: result.booking.status },
      checkoutUrl: result.booking.status === "PENDING_PAYMENT" ? `${siteUrl}/checkout/${result.booking.id}` : null,
    },
    { status: 201 },
  );
}
