import { z } from "zod";
import { InvalidInputError } from "./errors";

// Resumo estruturado que a IA (ou a equipe) deixa no encaminhamento, para a
// pessoa que assume não precisar reler a conversa inteira. Só dados que o
// atendimento precisa; nada de CPF, cartão, senha ou payload bruto.

export const handoffSummarySchema = z
  .object({
    /** Uma linha: o que o cliente quer. */
    headline: z.string().trim().min(1).max(200),
    /** Contexto curto, em texto corrido. */
    customerNeed: z.string().trim().max(1000).optional(),
    /** Dados coletados (ex.: método de interesse, espessura, tamanho do cabelo). */
    collected: z
      .record(z.string().min(1).max(60), z.string().trim().max(300))
      .refine((value) => Object.keys(value).length <= 20, "Dados demais no resumo")
      .optional(),
    /** O que ainda falta saber ou decidir. */
    openQuestions: z.array(z.string().trim().min(1).max(300)).max(10).optional(),
    suggestedNextStep: z.string().trim().max(300).optional(),
    /** Agendamento relacionado, quando houver. */
    bookingId: z.string().max(64).optional(),
  })
  .strict();

export type HandoffSummary = z.infer<typeof handoffSummarySchema>;

export function parseHandoffSummary(input: unknown): HandoffSummary {
  const parsed = handoffSummarySchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidInputError("Resumo do encaminhamento inválido.");
  }
  return parsed.data;
}

/** Texto legível do resumo (para a equipe, notificações e telas futuras). */
export function formatHandoffSummary(summary: HandoffSummary): string {
  const lines = [summary.headline];
  if (summary.customerNeed) lines.push(summary.customerNeed);
  if (summary.collected) {
    for (const [key, value] of Object.entries(summary.collected)) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  if (summary.openQuestions?.length) {
    lines.push("Pendências:");
    for (const question of summary.openQuestions) lines.push(`- ${question}`);
  }
  if (summary.suggestedNextStep) lines.push(`Sugestão: ${summary.suggestedNextStep}`);
  return lines.join("\n");
}
