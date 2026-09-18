import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({
    services: services.map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.name,
      minHours: service.minHours,
      maxHours: service.maxHours,
      basePrice: service.basePrice ? Number(service.basePrice) : null,
      active: service.active,
    })),
  });
}
