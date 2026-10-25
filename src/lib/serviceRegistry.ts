import { z } from "zod";

// Cadastro de serviços pelo painel (/admin/servicos): nome, duração, preço de
// referência e as regras de capacidade da agenda. Validação e regras puras.

export const serviceInputSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome").max(80),
    description: z.string().trim().max(500).nullable().default(null),
    minHours: z.number().min(0.5).max(24),
    maxHours: z.number().min(0.5).max(24),
    basePrice: z.number().positive().max(100_000).nullable(),
    active: z.boolean(),
    chairs: z.union([z.literal(1), z.literal(2)]),
    staff: z.enum(["ANY", "LYON", "THAY"]),
    fullDay: z.boolean(),
    maxPerPeriod: z.number().int().min(1).max(10).nullable(),
    maxPerDay: z.number().int().min(1).max(20).nullable(),
    startsMorning: z.boolean(),
    startsAfternoon: z.boolean(),
    rulesPending: z.boolean(),
    rulesNote: z.string().trim().max(500).nullable(),
    /** Pode ter mais de um agendamento deste serviço no mesmo dia. */
    allowSameDay: z.boolean(),
    /** Serviços com que pode dividir o dia (e se dividem a mesma cadeira no período). */
    companions: z.array(z.object({ serviceId: z.string().min(1), sharesChair: z.boolean() })).max(60),
  })
  .refine((value) => value.minHours <= value.maxHours, { message: "A duração mínima não pode passar da máxima", path: ["minHours"] })
  .refine((value) => value.startsMorning || value.startsAfternoon, { message: "Escolha ao menos um período de início", path: ["startsMorning"] })
  .refine((value) => !value.fullDay || value.startsMorning, { message: "Serviço de dia inteiro começa de manhã", path: ["fullDay"] });

export type ServiceInput = z.infer<typeof serviceInputSchema>;

/** "Manutenção no topo" → "manutencao-no-topo". */
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "servico";
}

/** Primeiro slug livre: nome, nome-2, nome-3... */
export function uniqueSlug(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type CompanionRow = { serviceId: string; companionId: string; sharesChair: boolean };

/** Linhas de "pode dividir o dia" do serviço, sempre nos dois sentidos. */
export function companionRows(
  serviceId: string,
  input: Pick<ServiceInput, "allowSameDay" | "companions">,
  existingServiceIds: ReadonlySet<string>,
): CompanionRow[] {
  const rows: CompanionRow[] = [];
  if (input.allowSameDay) rows.push({ serviceId, companionId: serviceId, sharesChair: false });
  const seen = new Set<string>();
  for (const companion of input.companions) {
    if (companion.serviceId === serviceId || seen.has(companion.serviceId) || !existingServiceIds.has(companion.serviceId)) continue;
    seen.add(companion.serviceId);
    rows.push({ serviceId, companionId: companion.serviceId, sharesChair: companion.sharesChair });
    rows.push({ serviceId: companion.serviceId, companionId: serviceId, sharesChair: companion.sharesChair });
  }
  return rows;
}
