import { getSaoPauloParts } from "../timezone";
import type {
  ConversationMode,
  ConversationRecord,
  HandoffRecord,
  MessageRecord,
  TransitionRecord,
} from "../conversations/types";
import type { UnitAgentConfig } from "./config";
import { activePromotions, type Promotion } from "./promotions";
import { currentPolicy, describePolicy, type BusinessPolicy } from "./policy";
import { deriveAgentStatus, type AgentStatus } from "./status";

// Contexto que o agente recebe: DADOS ESTRUTURADOS do backend. O que o backend
// não fornece aqui é desconhecido para o agente (ver `unknowns`).

export const CONTEXT_MESSAGE_LIMIT = 20;
const MESSAGE_TEXT_LIMIT = 600;

/** Dados brutos que um leitor (banco ou teste) entrega para montar o contexto. */
export type RawAgentData = {
  conversation: ConversationRecord;
  customerName: string | null;
  unit: UnitAgentConfig;
  promotions: Promotion[];
  /** Mensagens mais recentes, da mais antiga para a mais nova. */
  recentMessages: MessageRecord[];
  outboundMessageCount: number;
  lastTransition: TransitionRecord | null;
  activeHandoff: HandoffRecord | null;
  /** Próximo agendamento CONFIRMADO do cliente, se houver (dado do banco). */
  upcomingConfirmedBooking: { startsAt: Date; serviceName: string } | null;
};

export interface AgentContextReader {
  load(conversationId: string): Promise<RawAgentData | null>;
}

export type ContextMessage = { role: "user" | "assistant"; sender: MessageRecord["sender"]; text: string };

export type AgentContext = {
  conversationId: string;
  mode: ConversationMode;
  status: AgentStatus;
  nowIso: string;
  /** Data e hora de São Paulo já formatadas (o modelo não calcula fuso). */
  nowSaoPaulo: string;
  customerName: string | null;
  unit: Pick<UnitAgentConfig, "displayName" | "publicArea" | "humanHoursText" | "humanName" | "allowedUrls">;
  policy: BusinessPolicy;
  promotions: Promotion[];
  upcomingConfirmedBooking: { startsAtSaoPaulo: string; serviceName: string } | null;
  messages: ContextMessage[];
  /** Assuntos que o backend NÃO forneceu: o agente deve tratá-los como desconhecidos. */
  unknowns: string[];
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatSaoPaulo(date: Date): string {
  const p = getSaoPauloParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)} (${WEEKDAYS[p.weekday]}, horário de São Paulo)`;
}

function toContextMessage(message: MessageRecord): ContextMessage {
  const text =
    message.content.length > MESSAGE_TEXT_LIMIT
      ? `${message.content.slice(0, MESSAGE_TEXT_LIMIT)}…`
      : message.content;
  return { role: message.sender === "CUSTOMER" ? "user" : "assistant", sender: message.sender, text };
}

export function buildAgentContext(raw: RawAgentData, now: Date): AgentContext {
  const promotions = activePromotions(raw.promotions, now);

  const status = deriveAgentStatus({
    mode: raw.conversation.mode,
    activeHandoffStatus: raw.activeHandoff?.status ?? null,
    reopenedAfterFinished:
      raw.lastTransition?.fromMode === "FINISHED" && raw.lastTransition.toMode === "BOT",
    hasUpcomingConfirmedBooking: raw.upcomingConfirmedBooking !== null,
    outboundMessageCount: raw.outboundMessageCount,
  });

  // O que NÃO entra no contexto e, portanto, é desconhecido para o agente.
  const unknowns = [
    "preço ou faixa de preço (só a equipe passa o orçamento)",
    "disponibilidade de horários e vagas na agenda",
    "endereço completo e link do mapa (enviados pelo sistema depois da confirmação)",
    "status de pagamento ou comprovante (só a equipe confirma)",
  ];
  if (promotions.length === 0) unknowns.push("promoções (nenhuma está ativa)");

  return {
    conversationId: raw.conversation.id,
    mode: raw.conversation.mode,
    status,
    nowIso: now.toISOString(),
    nowSaoPaulo: formatSaoPaulo(now),
    customerName: raw.customerName,
    unit: {
      displayName: raw.unit.displayName,
      publicArea: raw.unit.publicArea,
      humanHoursText: raw.unit.humanHoursText,
      humanName: raw.unit.humanName,
      allowedUrls: raw.unit.allowedUrls,
    },
    policy: currentPolicy(),
    promotions,
    upcomingConfirmedBooking: raw.upcomingConfirmedBooking
      ? {
          startsAtSaoPaulo: formatSaoPaulo(raw.upcomingConfirmedBooking.startsAt),
          serviceName: raw.upcomingConfirmedBooking.serviceName,
        }
      : null,
    messages: raw.recentMessages.slice(-CONTEXT_MESSAGE_LIMIT).map(toContextMessage),
    unknowns,
  };
}

/** Bloco de texto com os dados confiáveis do sistema, anexado ao prompt. */
export function renderContextBlock(context: AgentContext): string {
  const lines: string[] = ["# DADOS DO SISTEMA (confiáveis; use só isto para fatos dinâmicos)", ""];
  lines.push(`- Agora: ${context.nowSaoPaulo}`);
  lines.push(`- Estado da conversa: ${context.status}`);
  lines.push(`- Nome do cliente: ${context.customerName ?? "não informado"}`);
  lines.push(`- Unidade: ${context.unit.displayName}${context.unit.publicArea ? ` (${context.unit.publicArea})` : ""}`);
  if (context.unit.humanName) lines.push(`- Atendente humana: ${context.unit.humanName}`);
  if (context.unit.humanHoursText) lines.push(`- Horário do atendimento humano: ${context.unit.humanHoursText}`);
  if (context.unit.allowedUrls.length > 0) {
    lines.push(`- Links que você pode citar: ${context.unit.allowedUrls.join(" | ")}`);
  }
  if (context.upcomingConfirmedBooking) {
    lines.push(
      `- Agendamento confirmado: ${context.upcomingConfirmedBooking.serviceName}, ${context.upcomingConfirmedBooking.startsAtSaoPaulo}. Você NÃO confirma nem altera agendamentos; o sistema envia a confirmação.`,
    );
  }

  lines.push("", "## Regras de sinal e cancelamento (do sistema)");
  for (const line of describePolicy(context.policy)) lines.push(`- ${line}`);

  lines.push("", "## Promoções ativas");
  if (context.promotions.length === 0) {
    lines.push("- Nenhuma. Se perguntarem por promoção, diga que não há promoção ativa no momento e siga o fluxo normal.");
  } else {
    for (const promotion of context.promotions) {
      lines.push(`- ${promotion.name}: R$ ${promotion.priceBrl}. Critérios: ${promotion.criteria.join("; ")}. Válida até ${promotion.validUntil}. A equipe confirma o enquadramento.`);
    }
  }

  lines.push("", "## Desconhecido para você (NÃO invente; encaminhe ou explique que a equipe informa)");
  for (const item of context.unknowns) lines.push(`- ${item}`);

  return lines.join("\n");
}
