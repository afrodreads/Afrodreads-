import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serviços ativos do cadastro (painel /admin/servicos), para o agendamento e os orçamentos.
export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    services: services.map((service) => ({
      slug: service.slug,
      name: service.name,
      minHours: service.minHours,
      maxHours: service.maxHours,
      basePrice: service.basePrice ? Number(service.basePrice) : null,
    })),
  });
}
