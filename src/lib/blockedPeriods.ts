import { occupiedPeriods, type CapacityRule, type Period } from "./capacity/engine";

// Travas da agenda feitas no painel: o dia inteiro ou só um período (manhã ou
// tarde). Fica numa linha de BlockedDate por dia:
//   fullDay = true                 → dia inteiro travado
//   fullDay = false, period = X    → só o período X travado
// Travar manhã e tarde é o mesmo que travar o dia inteiro.

export type BlockRow = { fullDay: boolean; period: Period | null };

export type LockState = { morning: boolean; afternoon: boolean };

export const NO_LOCK: LockState = { morning: false, afternoon: false };

/** Períodos travados por uma linha de bloqueio (sem linha = nenhum). */
export function blockedPeriodsOf(row: BlockRow | null | undefined): Period[] {
  if (!row) return [];
  if (row.fullDay) return ["MORNING", "AFTERNOON"];
  return row.period ? [row.period] : [];
}

export function lockStateOf(row: BlockRow | null | undefined): LockState {
  const periods = blockedPeriodsOf(row);
  return { morning: periods.includes("MORNING"), afternoon: periods.includes("AFTERNOON") };
}

/** O que gravar para o estado escolhido nos botões; `null` = apagar a trava. */
export function blockRowFor(state: LockState): BlockRow | null {
  if (state.morning && state.afternoon) return { fullDay: true, period: null };
  if (state.morning) return { fullDay: false, period: "MORNING" };
  if (state.afternoon) return { fullDay: false, period: "AFTERNOON" };
  return null;
}

/**
 * O serviço pode começar nesse período com essas travas? Um serviço de dia
 * inteiro (ex.: microlocs) ocupa manhã e tarde: não cabe se qualquer uma estiver travada.
 */
export function fitsLocks(rule: CapacityRule | undefined, period: Period, locked: readonly Period[]): boolean {
  return occupiedPeriods(rule, period).every((occupied) => !locked.includes(occupied));
}

/** Texto curto da trava, para o painel. */
export function lockLabel(state: LockState): string | null {
  if (state.morning && state.afternoon) return "Dia travado";
  if (state.morning) return "Manhã travada";
  if (state.afternoon) return "Tarde travada";
  return null;
}
