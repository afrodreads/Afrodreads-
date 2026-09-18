import { PrismaClient } from "@prisma/client";
import { SERVICES } from "../src/lib/services";

const prisma = new PrismaClient();

async function main() {
  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      create: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        minHours: service.minHours,
        maxHours: service.maxHours,
        order: service.order,
      },
      update: {
        name: service.name,
        description: service.description,
        minHours: service.minHours,
        maxHours: service.maxHours,
        order: service.order,
      },
    });
  }
  console.log(`Seed concluído: ${SERVICES.length} serviços sincronizados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
