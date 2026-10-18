import { PrismaClient } from "@prisma/client";
import { SERVICES } from "../src/lib/services";

const prisma = new PrismaClient();

// Só CRIA os serviços que ainda não existem (ex.: banco novo). Nunca
// sobrescreve um serviço existente: nome, duração, regras da agenda e preços
// são editados no painel (/admin/servicos) e o seed não pode desfazer isso.
async function main() {
  let created = 0;
  for (const service of SERVICES) {
    const exists = await prisma.service.findUnique({ where: { slug: service.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.service.create({
      data: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        minHours: service.minHours,
        maxHours: service.maxHours,
        order: service.order,
      },
    });
    created += 1;
  }
  console.log(`Seed concluído: ${created} serviço(s) criado(s), ${SERVICES.length - created} já existiam (não alterados).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
