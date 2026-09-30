import { z } from "zod";
import { handoffSummarySchema } from "../conversations/handoff";
import { HANDOFF_REASONS } from "../conversations/types";

// Ferramentas que o modelo pode pedir. São só duas e ambas apenas PROPÕEM:
//   - request_handoff: propor passar a conversa para a equipe;
//   - update_lead_data: propor anotações de CRM (§24 do V2).
//
// Não existe ferramenta para preço, disponibilidade, agenda, pagamento, estorno,
// cancelamento, extensão de prazo, envio de card/localização ou mensagem. Essas
// ações são humanas (painel) ou eventos SYSTEM. Se o modelo pedir uma ferramenta
// que não está aqui, o pedido é descartado.

export const TOOL_NAMES = ["request_handoff", "update_lead_data"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

const short = z.string().trim().min(1).max(200);

export const leadDataSchema = z
  .object({
    intent: z
      .enum([
        "INFORMACAO",
        "APLICACAO",
        "MANUTENCAO",
        "PROMOCAO",
        "ORCAMENTO",
        "AGENDAMENTO",
        "POS_ATENDIMENTO",
        "RECLAMACAO",
        "OUTRO",
      ])
      .optional(),
    temperature: z.enum(["QUENTE", "MORNO", "FRIO"]).optional(),
    origin: short.optional(),
    appointmentType: z.enum(["aplicacao_do_zero", "manutencao"]).optional(),
    material: z.enum(["proprio", "sintetico", "humano"]).optional(),
    method: short.optional(),
    currentLength: short.optional(),
    desiredLength: short.optional(),
    thickness: z.enum(["P", "M", "G"]).optional(),
    color: short.optional(),
    headArea: z.enum(["topo", "cabeca_toda"]).optional(),
    haircut: z.enum(["alto", "americano"]).optional(),
    hasCurrentPhoto: z.boolean().optional(),
    hasReferencePhoto: z.boolean().optional(),
    desiredPeriod: short.optional(),
    urgencyOrEvent: short.optional(),
  })
  .strict();

export type LeadData = z.infer<typeof leadDataSchema>;

const requestHandoffSchema = z
  .object({
    reason: z.enum(HANDOFF_REASONS as [string, ...string[]]),
    summary: handoffSummarySchema,
  })
  .strict();

export type ProposedAction =
  | { tool: "request_handoff"; reason: (typeof HANDOFF_REASONS)[number]; summary: z.infer<typeof handoffSummarySchema> }
  | { tool: "update_lead_data"; data: LeadData };

export type ToolDefinition = { name: ToolName; description: string };

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "request_handoff",
    description:
      "Propõe passar a conversa para a atendente humana, com motivo e resumo estruturado. Use nos casos da seção de encaminhamento.",
  },
  {
    name: "update_lead_data",
    description: "Propõe anotar dados do projeto do cliente (intenção, material, método, etc.). Só dados que o cliente informou.",
  },
];

export type ToolCallRequest = { name: string; arguments: unknown };

export type ToolParseResult =
  | { ok: true; action: ProposedAction }
  | { ok: false; reason: "unknown_tool" | "invalid_arguments"; name: string };

export function parseToolCall(call: ToolCallRequest): ToolParseResult {
  if (call.name === "request_handoff") {
    const parsed = requestHandoffSchema.safeParse(call.arguments);
    if (!parsed.success) return { ok: false, reason: "invalid_arguments", name: call.name };
    return {
      ok: true,
      action: {
        tool: "request_handoff",
        reason: parsed.data.reason as (typeof HANDOFF_REASONS)[number],
        summary: parsed.data.summary,
      },
    };
  }
  if (call.name === "update_lead_data") {
    const parsed = leadDataSchema.safeParse(call.arguments);
    if (!parsed.success) return { ok: false, reason: "invalid_arguments", name: call.name };
    return { ok: true, action: { tool: "update_lead_data", data: parsed.data } };
  }
  return { ok: false, reason: "unknown_tool", name: call.name };
}
