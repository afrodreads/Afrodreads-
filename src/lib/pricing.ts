import { getSaoPauloParts, saoPauloCalendarDaysBetween } from "./timezone";

export const FIXED_DEPOSIT_BRL = 50;
export const PERCENTAGE_DEPOSIT_RATE = 0.5;
/** Antecedência mínima (em dias de calendário de SP) para o sinal ser devolvido. */
export const REFUND_MIN_DAYS_BEFORE = 2;
const DECEMBER = 12;

export type DepositCalculationInput = {
  servicePrice: number;
  scheduledStart: Date;
  isOutOfTownSeason: boolean;
};

export type DepositCalculationResult = {
  depositAmount: number;
  depositIsPercentage: boolean;
  remainingAmount: number;
};

/**
 * Regra de negócio: sinal fixo de R$50 o ano todo, exceto em dezembro e em
 * atendimentos por temporada fora de SP, quando o sinal passa a ser 50% do
 * valor do serviço. "Dezembro" é o mês do atendimento no calendário de
 * São Paulo (não o do servidor).
 */
export function calculateDeposit({
  servicePrice,
  scheduledStart,
  isOutOfTownSeason,
}: DepositCalculationInput): DepositCalculationResult {
  const isDecember = getSaoPauloParts(scheduledStart).month === DECEMBER;
  const usesPercentage = isDecember || isOutOfTownSeason;

  const depositAmount = usesPercentage
    ? roundToCents(servicePrice * PERCENTAGE_DEPOSIT_RATE)
    : Math.min(FIXED_DEPOSIT_BRL, servicePrice);

  return {
    depositAmount,
    depositIsPercentage: usesPercentage,
    remainingAmount: roundToCents(servicePrice - depositAmount),
  };
}

export type CancellationRefundInput = {
  scheduledStart: Date;
  cancellationRequestedAt: Date;
};

/**
 * Regra de negócio: cancelamento com 2 ou mais dias de antecedência devolve
 * o sinal; com 1 dia ou no mesmo dia do atendimento, o sinal não é devolvido.
 * Os dias são contados no calendário de São Paulo.
 */
export function isDepositRefundable({
  scheduledStart,
  cancellationRequestedAt,
}: CancellationRefundInput): boolean {
  return saoPauloCalendarDaysBetween(cancellationRequestedAt, scheduledStart) >= REFUND_MIN_DAYS_BEFORE;
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
