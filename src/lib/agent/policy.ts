import { FIXED_DEPOSIT_BRL, PERCENTAGE_DEPOSIT_RATE, REFUND_MIN_DAYS_BEFORE } from "../pricing";
import { BOOKING_PAYMENT_TTL_MINUTES } from "../bookingRules";

// Regras de negócio que o agente pode EXPLICAR. Os números vêm das mesmas
// constantes que o sistema usa para cobrar e devolver (pricing.ts), para o que
// o agente diz nunca divergir do que o sistema faz. O agente explica; quem
// confirma, cancela ou devolve é a equipe.

export type BusinessPolicy = {
  depositFixedBrl: number;
  depositPercentage: number; // 0.5 = 50%
  depositPercentageCases: string[];
  refundMinDaysBefore: number;
  onlinePaymentWindowMinutes: number;
  /** Valores em reais que o agente pode citar (além das promoções ativas). */
  quotableAmountsBrl: number[];
};

// Valores do §11 do V2 que o sistema ainda não calcula (atraso). Ficam aqui,
// num só lugar, e um teste confere com o texto do V2.
export const LATE_FEE_BRL_PER_15_MIN = 20;

export function currentPolicy(): BusinessPolicy {
  return {
    depositFixedBrl: FIXED_DEPOSIT_BRL,
    depositPercentage: PERCENTAGE_DEPOSIT_RATE,
    depositPercentageCases: ["dezembro", "temporada fora de São Paulo"],
    refundMinDaysBefore: REFUND_MIN_DAYS_BEFORE,
    onlinePaymentWindowMinutes: BOOKING_PAYMENT_TTL_MINUTES,
    quotableAmountsBrl: [FIXED_DEPOSIT_BRL, LATE_FEE_BRL_PER_15_MIN],
  };
}

/** Texto curto das regras, gerado dos números do sistema (vai no bloco de contexto). */
export function describePolicy(policy: BusinessPolicy): string[] {
  const percent = Math.round(policy.depositPercentage * 100);
  return [
    `Sinal: R$ ${policy.depositFixedBrl} (descontado do valor final); em ${policy.depositPercentageCases.join(" e ")} o sinal é ${percent}% do serviço.`,
    `Cancelamento com ${policy.refundMinDaysBefore} dias ou mais de antecedência: o sinal é devolvido. Com menos, não é devolvido.`,
    "Quem cancela, devolve ou remarca é a equipe; o agente só explica a regra.",
  ];
}
