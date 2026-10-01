// Aplica o arquivo de configuração de uma unidade no banco (Unit + StaffUser).
//
//   npx tsx prisma/apply-unit-config.ts prisma/data/unit-principal.json          (só mostra o plano)
//   npx tsx prisma/apply-unit-config.ts prisma/data/unit-principal.json --apply  (grava)
//
// Valores "PENDENTE" nunca são gravados: o campo fica nulo e o sistema trata
// como desconhecido (ex.: sem endereço, o SYSTEM não envia localização).
import { readFileSync } from "node:fs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const field = z.object({ value: z.string().min(1).max(500), source: z.string().max(500) }).passthrough();
const configSchema = z
  .object({
    slug: z.string().min(1).max(60),
    name: field,
    publicArea: field,
    address: field,
    mapUrl: field,
    phone: field,
    humanHoursText: field,
    reviewUrl: field,
    parkingInfo: field,
    timezone: field,
    staff: z.array(z.object({ name: z.string().min(1).max(80), role: z.enum(["ADMIN", "ATTENDANT"]) }).passthrough()).max(50),
  })
  .passthrough();

const valueOf = (f: { value: string }) => (f.value.trim().toUpperCase() === "PENDENTE" ? null : f.value.trim());

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error("Informe o arquivo de configuração.");
  const config = configSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const apply = flag === "--apply";

  const unitData = {
    name: valueOf(config.name),
    publicArea: valueOf(config.publicArea),
    address: valueOf(config.address),
    mapUrl: valueOf(config.mapUrl),
    phone: valueOf(config.phone),
    humanHoursText: valueOf(config.humanHoursText),
    reviewUrl: valueOf(config.reviewUrl),
    parkingInfo: valueOf(config.parkingInfo),
    timezone: valueOf(config.timezone),
  };
  const pending = Object.entries(unitData).filter(([, v]) => v === null).map(([k]) => k);

  console.log(`Unidade "${config.slug}": ${Object.keys(unitData).length - pending.length} campos com valor; PENDENTES: ${pending.join(", ") || "nenhum"}`);
  console.log(`Equipe: ${config.staff.map((s) => `${s.name} (${s.role})`).join(", ")}`);
  if (!apply) {
    console.log("Nada foi gravado (use --apply para gravar).");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const unit = await prisma.unit.findUnique({ where: { slug: config.slug } });
    if (!unit) throw new Error(`Unidade "${config.slug}" não existe no banco (rode as migrations).`);
    const data = Object.fromEntries(Object.entries(unitData).filter(([key, v]) => v !== null || key !== "name"));
    await prisma.unit.update({ where: { id: unit.id }, data: data as Record<string, string | null> });
    for (const person of config.staff) {
      const existing = await prisma.staffUser.findFirst({ where: { name: person.name, unitId: person.role === "ADMIN" ? null : unit.id } });
      if (existing) {
        await prisma.staffUser.update({ where: { id: existing.id }, data: { role: person.role, active: true } });
      } else {
        await prisma.staffUser.create({ data: { name: person.name, role: person.role, unitId: person.role === "ADMIN" ? null : unit.id } });
      }
    }
    console.log("Configuração gravada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
