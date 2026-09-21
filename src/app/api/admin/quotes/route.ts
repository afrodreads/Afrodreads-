import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

const QUOTE_EXPIRATION_HOURS = 48;

const createQuoteSchema = z.object({
  serviceSlug: z.string(),
  servicePrice: z.number().positive(),
  isOutOfTownSeason: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const parsed = createQuoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const service = await prisma.service.findUnique({ where: { slug: data.serviceSlug } });
  if (!service) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + QUOTE_EXPIRATION_HOURS * 60 * 60 * 1000);

  const quote = await prisma.quote.create({
    data: {
      token,
      serviceId: service.id,
      servicePrice: data.servicePrice,
      isOutOfTownSeason: data.isOutOfTownSeason,
      expiresAt,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return NextResponse.json(
    { quote, url: `${siteUrl}/orcamento/${token}` },
    { status: 201 },
  );
}
