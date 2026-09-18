import { differenceInCalendarDays } from "date-fns";

const FIXED_DEPOSIT_BRL = 50;
const PERCENTAGE_DEPOSIT_RATE = 0.5;
const DECEMBER_MONTH_INDEX = 11; // Date.getMonth() é 0-indexado

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
 * valor do serviço.
 */
export function calculateDeposit({
  servicePrice,
  scheduledStart,
  isOutOfTownSeason,
}: DepositCalculationInput): DepositCalculationResult {
  const isDecember = scheduledStart.getMonth() === DECEMBER_MONTH_INDEX;
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
 */
export function isDepositRefundable({
  scheduledStart,
  cancellationRequestedAt,
}: CancellationRefundInput): boolean {
  const daysUntilAppointment = differenceInCalendarDays(
    scheduledStart,
    cancellationRequestedAt,
  );
  return daysUntilAppointment >= 2;
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
