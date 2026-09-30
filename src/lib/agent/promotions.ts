import { z } from "zod";
import { saoPauloDateKey } from "../timezone";

// Promoções são DADOS estruturados, por unidade, com início e fim em dias de
// calendário de São Paulo (inclusive). A data de referência é SEMPRE o relógio
// do servidor convertido para America/Sao_Paulo; nunca uma data vinda do modelo.
// Inativa, fora do período ou de outra unidade = desconhecida para o agente, e o
// guardrail barra a oferta.

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const promotionSchema = z.object({
  id: z.string().min(1).max(60),
  unitId: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  active: z.boolean(),
  /** Primeiro dia (AAAA-MM-DD, SP). null = sem data de início. */
  startsOn: dateKey.nullable(),
  /** Último dia (AAAA-MM-DD, SP), inclusive. */
  endsOn: dateKey,
  /** Valor fixo em reais, quando a promoção tiver. */
  priceBrl: z.number().positive().max(100_000).nullable(),
  /** Regras em texto curto, como a equipe cadastrou. */
  rules: z.array(z.string().min(1).max(200)).min(1).max(12),
  /** Condições estruturadas (ex.: área, corte, material). */
  conditions: z.record(z.string().max(40), z.string().max(100)).nullable().default(null),
  /** Serviço ao qual a promoção se aplica (slug), se houver. */
  serviceSlug: z.string().max(80).nullable().default(null),
  /** Enquadramento confirmado pela equipe. */
  requiresStaffConfirmation: z.boolean().default(true),
});

export type Promotion = z.infer<typeof promotionSchema>;

export interface PromotionsProvider {
  /** Promoções cadastradas da unidade (ativas ou não; o filtro por data é aqui). */
  list(unitId: string): Promise<Promotion[]>;
}

export function isPromotionActive(promotion: Promotion, now: Date): boolean {
  if (!promotion.active) return false;
  const today = saoPauloDateKey(now);
  if (promotion.startsOn && today < promotion.startsOn) return false;
  return today <= promotion.endsOn;
}

/** Só as promoções da unidade informada que valem hoje (calendário de SP). */
export function activePromotions(promotions: Promotion[], now: Date, unitId?: string): Promotion[] {
  return promotions.filter(
    (promotion) => (unitId === undefined || promotion.unitId === unitId) && isPromotionActive(promotion, now),
  );
}

/** Provedor simples a partir de dados já carregados (config ou teste). */
export function staticPromotions(raw: unknown[]): PromotionsProvider {
  const promotions = raw.map((item) => promotionSchema.parse(item));
  return { list: async (unitId) => promotions.filter((promotion) => promotion.unitId === unitId) };
}
