import { prisma } from "./prisma";
import { companionRows, uniqueSlug, type ServiceInput } from "./serviceRegistry";

// Leitura e gravação do cadastro de serviços (só o painel usa).

export async function listServicesForAdmin() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { companions: { select: { companionId: true, sharesChair: true } } },
  });
  return services.map((service) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    minHours: service.minHours,
    maxHours: service.maxHours,
    basePrice: service.basePrice ? Number(service.basePrice) : null,
    active: service.active,
    chairs: service.chairs >= 2 ? 2 : 1,
    staff: service.staff,
    fullDay: service.fullDay,
    maxPerPeriod: service.maxPerPeriod,
    maxPerDay: service.maxPerDay,
    startsMorning: service.startsMorning,
    startsAfternoon: service.startsAfternoon,
    rulesPending: service.rulesPending,
    rulesNote: service.rulesNote,
    allowSameDay: service.companions.some((row) => row.companionId === service.id),
    companions: service.companions
      .filter((row) => row.companionId !== service.id)
      .map((row) => ({ serviceId: row.companionId, sharesChair: row.sharesChair })),
  }));
}

export type AdminService = Awaited<ReturnType<typeof listServicesForAdmin>>[number];

function serviceData(input: ServiceInput) {
  return {
    name: input.name,
    description: input.description,
    minHours: input.minHours,
    maxHours: input.maxHours,
    basePrice: input.basePrice,
    active: input.active,
    chairs: input.chairs,
    staff: input.staff,
    fullDay: input.fullDay,
    maxPerPeriod: input.maxPerPeriod,
    maxPerDay: input.maxPerDay,
    startsMorning: input.startsMorning,
    startsAfternoon: input.startsAfternoon,
    rulesPending: input.rulesPending,
    rulesNote: input.rulesNote,
  };
}

/** Grava o serviço e as combinações (nos dois sentidos) numa transação. */
export async function saveService(id: string | null, input: ServiceInput): Promise<{ id: string; slug: string }> {
  return prisma.$transaction(async (tx) => {
    const all = await tx.service.findMany({ select: { id: true, slug: true, order: true } });
    let saved: { id: string; slug: string };
    if (id) {
      saved = await tx.service.update({ where: { id }, data: serviceData(input), select: { id: true, slug: true } });
    } else {
      const slug = uniqueSlug(input.name, new Set(all.map((service) => service.slug)));
      const order = Math.max(0, ...all.map((service) => service.order)) + 1;
      saved = await tx.service.create({ data: { ...serviceData(input), slug, order }, select: { id: true, slug: true } });
    }
    const ids = new Set([...all.map((service) => service.id), saved.id]);
    await tx.serviceCompanion.deleteMany({ where: { OR: [{ serviceId: saved.id }, { companionId: saved.id }] } });
    const rows = companionRows(saved.id, input, ids);
    if (rows.length) await tx.serviceCompanion.createMany({ data: rows, skipDuplicates: true });
    return saved;
  });
}
