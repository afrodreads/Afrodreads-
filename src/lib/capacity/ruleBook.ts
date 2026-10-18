import type { CapacityRule, RuleBook } from "./engine";
import { DEFAULT_COMPANIONS, DEFAULT_RULES } from "./defaults";

// Converte o cadastro de serviços (linhas do banco) no formato do motor.

export type ServiceRuleRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  chairs: number;
  staff: "ANY" | "LYON" | "THAY";
  fullDay: boolean;
  maxPerPeriod: number | null;
  maxPerDay: number | null;
  startsMorning: boolean;
  startsAfternoon: boolean;
};

export type CompanionRow = { serviceId: string; companionId: string; sharesChair: boolean };

export function buildRuleBook(services: readonly ServiceRuleRow[], companions: readonly CompanionRow[]): RuleBook {
  const book = new Map<string, CapacityRule>();
  for (const service of services) {
    const own = new Map<string, { sharesChair: boolean }>();
    for (const row of companions) {
      if (row.serviceId === service.id) own.set(row.companionId, { sharesChair: row.sharesChair });
    }
    book.set(service.id, {
      id: service.id,
      slug: service.slug,
      name: service.name,
      active: service.active,
      chairs: service.chairs >= 2 ? 2 : 1,
      staff: service.staff,
      fullDay: service.fullDay,
      maxPerPeriod: service.maxPerPeriod,
      maxPerDay: service.maxPerDay,
      startsMorning: service.startsMorning,
      startsAfternoon: service.startsAfternoon,
      companions: own,
    });
  }
  return book;
}

/** As regras padrão (carga inicial) como RuleBook, com o slug como id. Usado nos testes. */
export function defaultRuleBook(): RuleBook {
  const services: ServiceRuleRow[] = DEFAULT_RULES.map((rule) => ({
    id: rule.slug,
    slug: rule.slug,
    name: rule.create?.name ?? rule.slug,
    active: true,
    chairs: rule.chairs,
    staff: rule.staff,
    fullDay: rule.fullDay,
    maxPerPeriod: rule.maxPerPeriod,
    maxPerDay: rule.maxPerDay,
    startsMorning: rule.startsMorning,
    startsAfternoon: rule.startsAfternoon,
  }));
  const companions: CompanionRow[] = DEFAULT_COMPANIONS.flatMap(([a, b, sharesChair]) =>
    a === b
      ? [{ serviceId: a, companionId: b, sharesChair }]
      : [
          { serviceId: a, companionId: b, sharesChair },
          { serviceId: b, companionId: a, sharesChair },
        ],
  );
  return buildRuleBook(services, companions);
}
