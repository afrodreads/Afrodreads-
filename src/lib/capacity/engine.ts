// Motor de capacidade da agenda. Puro: recebe as regras dos serviços (vindas
// do cadastro no banco) e os agendamentos do dia, e responde se um serviço
// cabe. Nenhuma regra de serviço é fixa aqui: tudo vem de `CapacityRule`.
//
// Modelo: cada dia tem 2 períodos (manhã e tarde) e 2 cadeiras (Lyon e Thay),
// ou seja, 4 "cadeiras-período". Um serviço cabe quando:
//  1. pode começar naquele período;
//  2. os limites por período e por dia do serviço são respeitados;
//  3. ele pode dividir o dia com cada agendamento já existente;
//  4. existe uma distribuição de todos nas cadeiras que respeita quem pode
//     fazer cada serviço (uma cadeira atende um por período, salvo os pares
//     que compartilham cadeira, como manutenção completa + retwist).

export type Period = "MORNING" | "AFTERNOON";
export const PERIODS: readonly Period[] = ["MORNING", "AFTERNOON"];

export type Chair = "LYON" | "THAY";
export const CHAIRS: readonly Chair[] = ["LYON", "THAY"];

export type CapacityRule = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  chairs: 1 | 2;
  staff: "ANY" | "LYON" | "THAY";
  fullDay: boolean;
  maxPerPeriod: number | null;
  maxPerDay: number | null;
  startsMorning: boolean;
  startsAfternoon: boolean;
  /** serviceId → compartilha a cadeira no mesmo período. Contém o próprio id se pode repetir no dia. */
  companions: ReadonlyMap<string, { sharesChair: boolean }>;
};

export type RuleBook = ReadonlyMap<string, CapacityRule>;

export type DayBooking = { id: string; serviceId: string; period: Period; forced?: boolean };

export type Rejection =
  | "unknown_service"
  | "inactive_service"
  | "period_not_allowed"
  | "max_per_period"
  | "max_per_day"
  | "incompatible"
  | "no_chair";

export type CheckResult = { ok: true } | { ok: false; reason: Rejection };

export const REJECTION_LABEL: Record<Rejection, string> = {
  unknown_service: "Serviço sem regra cadastrada",
  inactive_service: "Serviço desativado",
  period_not_allowed: "O serviço não começa neste período",
  max_per_period: "Limite do serviço no período atingido",
  max_per_day: "Limite do serviço no dia atingido",
  incompatible: "Não pode dividir o dia com um agendamento existente",
  no_chair: "Sem cadeira livre",
};

/** Períodos que o agendamento ocupa. */
export function occupiedPeriods(rule: CapacityRule | undefined, period: Period): Period[] {
  if (!rule) return [...PERIODS];
  return rule.fullDay ? [...PERIODS] : [period];
}

function chairOptions(rule: CapacityRule | undefined): Chair[][] {
  if (!rule || rule.chairs >= 2) return [["LYON", "THAY"]];
  if (rule.staff === "LYON") return [["LYON"]];
  if (rule.staff === "THAY") return [["THAY"]];
  return [["LYON"], ["THAY"]];
}

export function canStartIn(rule: CapacityRule, period: Period): boolean {
  if (rule.fullDay && period !== "MORNING") return false;
  return period === "MORNING" ? rule.startsMorning : rule.startsAfternoon;
}

/** Os dois serviços podem estar no mesmo dia? (dados gravados nos dois sentidos; checa os dois por segurança) */
export function compatible(book: RuleBook, a: string, b: string): boolean {
  const ra = book.get(a);
  const rb = book.get(b);
  if (!ra || !rb) return false;
  return ra.companions.has(b) || rb.companions.has(a);
}

function sharesChair(book: RuleBook, a: string, b: string): boolean {
  return Boolean(book.get(a)?.companions.get(b)?.sharesChair || book.get(b)?.companions.get(a)?.sharesChair);
}

export type Assignment = Map<string, Chair[]>;

/**
 * Distribui os agendamentos nas cadeiras. Cada cadeira atende um agendamento
 * por período, exceto pares que compartilham a cadeira. `null` = não cabe.
 */
export function assignChairs(book: RuleBook, bookings: readonly DayBooking[]): Assignment | null {
  // Mais restritos primeiro (2 cadeiras, cadeira fixa) para a busca terminar cedo.
  const ordered = [...bookings].sort((x, y) => chairOptions(book.get(x.serviceId)).length - chairOptions(book.get(y.serviceId)).length);
  const assignment: Assignment = new Map();
  const cells = new Map<string, DayBooking[]>(); // "CHAIR|PERIOD" → agendamentos

  const fits = (booking: DayBooking, chairs: Chair[]): boolean => {
    for (const chair of chairs) {
      for (const period of occupiedPeriods(book.get(booking.serviceId), booking.period)) {
        for (const other of cells.get(`${chair}|${period}`) ?? []) {
          if (!sharesChair(book, booking.serviceId, other.serviceId)) return false;
        }
      }
    }
    return true;
  };
  const place = (booking: DayBooking, chairs: Chair[], add: boolean) => {
    for (const chair of chairs) {
      for (const period of occupiedPeriods(book.get(booking.serviceId), booking.period)) {
        const key = `${chair}|${period}`;
        const list = cells.get(key) ?? [];
        cells.set(key, add ? [...list, booking] : list.filter((item) => item !== booking));
      }
    }
  };

  const search = (index: number): boolean => {
    if (index === ordered.length) return true;
    const booking = ordered[index];
    for (const chairs of chairOptions(book.get(booking.serviceId))) {
      if (!fits(booking, chairs)) continue;
      place(booking, chairs, true);
      assignment.set(booking.id, chairs);
      if (search(index + 1)) return true;
      place(booking, chairs, false);
      assignment.delete(booking.id);
    }
    return false;
  };

  return search(0) ? assignment : null;
}

/** O serviço cabe no dia, no período, com os agendamentos existentes? */
export function checkAdd(book: RuleBook, existing: readonly DayBooking[], serviceId: string, period: Period): CheckResult {
  const rule = book.get(serviceId);
  if (!rule) return { ok: false, reason: "unknown_service" };
  if (!rule.active) return { ok: false, reason: "inactive_service" };
  if (!canStartIn(rule, period)) return { ok: false, reason: "period_not_allowed" };

  const same = existing.filter((booking) => booking.serviceId === serviceId);
  if (rule.maxPerDay !== null && same.length + 1 > rule.maxPerDay) return { ok: false, reason: "max_per_day" };
  if (rule.maxPerPeriod !== null) {
    for (const p of occupiedPeriods(rule, period)) {
      const inPeriod = same.filter((booking) => occupiedPeriods(rule, booking.period).includes(p)).length;
      if (inPeriod + 1 > rule.maxPerPeriod) return { ok: false, reason: "max_per_period" };
    }
  }

  for (const booking of existing) {
    if (!compatible(book, serviceId, booking.serviceId)) return { ok: false, reason: "incompatible" };
  }

  const candidate: DayBooking = { id: "__candidato__", serviceId, period };
  if (!assignChairs(book, [...existing, candidate])) return { ok: false, reason: "no_chair" };
  return { ok: true };
}

/**
 * Quantos agendamentos a mais do serviço ainda cabem no dia (busca gulosa,
 * na ordem manhã → tarde). Usa exatamente a mesma regra de `checkAdd`, então
 * a cor do calendário nunca discorda do que a agenda aceita.
 */
export function remainingFor(
  book: RuleBook,
  existing: readonly DayBooking[],
  serviceId: string,
  openPeriods: readonly Period[] = PERIODS,
): number {
  const day = [...existing];
  let count = 0;
  for (let guard = 0; guard < 12; guard++) {
    const period = openPeriods.find((p) => checkAdd(book, day, serviceId, p).ok);
    if (!period) break;
    day.push({ id: `__vaga_${guard}__`, serviceId, period });
    count += 1;
  }
  return count;
}

export type DayColor = "green" | "yellow" | "red";

/** Cor para o cliente, considerando o serviço escolhido: 0 vaga = vermelho, 1 = amarelo, 2+ = verde. */
export function serviceDayColor(remaining: number): DayColor {
  if (remaining <= 0) return "red";
  if (remaining === 1) return "yellow";
  return "green";
}

/** Cadeiras-período livres (de 4). Dia acima da capacidade (encaixe forçado) = 0. */
export function freeCells(book: RuleBook, existing: readonly DayBooking[]): number {
  const assignment = assignChairs(book, existing);
  if (!assignment) return 0;
  const used = new Set<string>();
  for (const booking of existing) {
    for (const chair of assignment.get(booking.id) ?? []) {
      for (const period of occupiedPeriods(book.get(booking.serviceId), booking.period)) used.add(`${chair}|${period}`);
    }
  }
  return CHAIRS.length * PERIODS.length - used.size;
}

/**
 * Cor do dia no painel (o dia como um todo): vermelho se nenhum serviço ativo
 * cabe mais; amarelo se sobrou só 1 cadeira-período; verde se sobraram 2 ou mais.
 */
export function adminDayColor(book: RuleBook, existing: readonly DayBooking[], openPeriods: readonly Period[] = PERIODS): DayColor {
  const anyFits = [...book.values()].some(
    (rule) => rule.active && openPeriods.some((period) => checkAdd(book, existing, rule.id, period).ok),
  );
  if (!anyFits) return "red";
  return freeCells(book, existing) <= 1 ? "yellow" : "green";
}
