import { z } from "zod";
import { getSaoPauloParts } from "../timezone";

// Promoções são DADOS com validade, nunca texto fixo no prompt. O agente só
// conhece uma promoção enquanto ela estiver ativa aqui; vencida (ou sem dado),
// ela é desconhecida para o modelo e o guardrail barra qualquer oferta.

export const promotionSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  /** Valor fixo em reais. */
  priceBrl: z.number().positive().max(100_000),
  /** Critérios em texto curto, exatamente como a equipe definiu. */
  criteria: z.array(z.string().min(1).max(200)).min(1).max(10),
  /** Último dia de validade, no calendário de São Paulo (AAAA-MM-DD). */
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Regra de enquadramento que só a equipe confirma. */
  requiresStaffConfirmation: z.boolean().default(true),
});

export type Promotion = z.infer<typeof promotionSchema>;

export interface PromotionsProvider {
  list(unitId: string): Promise<Promotion[]>;
}

function dayKey(date: Date): string {
  const p = getSaoPauloParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Ativa até o fim do último dia de validade, pelo calendário de SP. */
export function isPromotionActive(promotion: Promotion, now: Date): boolean {
  return dayKey(now) <= promotion.validUntil;
}

export function activePromotions(promotions: Promotion[], now: Date): Promotion[] {
  return promotions.filter((promotion) => isPromotionActive(promotion, now));
}

/** Provedor simples a partir de dados já carregados (config, banco ou teste). */
export function staticPromotions(raw: unknown[]): PromotionsProvider {
  const promotions = raw.map((item) => promotionSchema.parse(item));
  return { list: async () => promotions };
}
