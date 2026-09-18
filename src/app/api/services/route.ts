import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    services: services.map((service) => ({
      slug: service.slug,
      basePrice: service.basePrice ? Number(service.basePrice) : null,
    })),
  });
}
