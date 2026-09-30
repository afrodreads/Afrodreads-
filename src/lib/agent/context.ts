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
// não fornece aqui é desconhecido para o agente (ver `unknowns`). Preço de
// serviço NUNCA faz parte do contexto.

export const CONTEXT_MESSAGE_LIMIT = 20;
const MESSAGE_TEXT_LIMIT = 600;

/**
 * Dados brutos que um leitor (banco ou teste) entrega. Quando lidos "até" uma
 * mensagem (replay), mensagens, transições e encaminhamentos posteriores a ela
 * ficam de fora, e `modeAtTrigger` é o modo da conversa naquele momento.
 */
export type RawAgentData = {
  conversation: ConversationRecord;
  unitId: string;
  customerName: string | null;
  unit: UnitAgentConfig;
  promotions: Promotion[];
  /** Mensagens mais recentes, da mais antiga para a mais nova (até o gatilho). */
  recentMessages: MessageRecord[];
  outboundMessageCount: number;
  lastTransition: TransitionRecord | null;
  activeHandoff: HandoffRecord | null;
  /** Próximo agendamento CONFIRMADO do cliente, se houver (dado do banco). */
  upcomingConfirmedBooking: { startsAt: Date; serviceName: string } | null;
  /** Modo da conversa no instante da mensagem-gatilho (derivado das transições). */
  modeAtTrigger: ConversationMode;
};

export type ContextLoadOptions = { upToMessageId?: string };

export interface AgentContextReader {
  load(conversationId: string, options?: ContextLoadOptions): Promise<RawAgentData | null>;
}

/** Modo num instante, a partir da última transição até ele (sem transição = BOT). */
export function modeFromLastTransition(last: Pick<TransitionRecord, "toMode"> | null): ConversationMode {
  return last?.toMode ?? "BOT";
}

export type ContextMessage = {
  id: string;
  role: "user" | "assistant";
  sender: MessageRecord["sender"];
  text: string;
};

export type AgentContext = {
  conversationId: string;
  unitId: string;
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
    message.content.length > MESSAGE_TEXT_LIMIT ? `${message.content.slice(0, MESSAGE_TEXT_LIMIT)}…` : message.content;
  return { id: message.id, role: message.sender === "CUSTOMER" ? "user" : "assistant", sender: message.sender, text };
}

export function buildAgentContext(raw: RawAgentData, now: Date, options: { useModeAtTrigger?: boolean } = {}): AgentContext {
  const mode = options.useModeAtTrigger ? raw.modeAtTrigger : raw.conversation.mode;
  const promotions = activePromotions(raw.promotions, now, raw.unitId);

  const status = deriveAgentStatus({
    mode,
    activeHandoffStatus: raw.activeHandoff?.status ?? null,
    reopenedAfterFinished: raw.lastTransition?.fromMode === "FINISHED" && raw.lastTransition.toMode === "BOT",
    hasUpcomingConfirmedBooking: raw.upcomingConfirmedBooking !== null,
    outboundMessageCount: raw.outboundMessageCount,
  });

  const unknowns = [
    "preço ou faixa de preço (só a equipe passa o orçamento)",
    "disponibilidade de horários e vagas na agenda",
    "endereço completo e link do mapa (enviados pelo sistema depois da confirmação)",
    "status de pagamento ou comprovante (só a equipe confirma)",
  ];
  if (promotions.length === 0) unknowns.push("promoções (nenhuma está ativa)");

  return {
    conversationId: raw.conversation.id,
    unitId: raw.unitId,
    mode,
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

/**
 * Resumo do contexto para o AgentRun: o suficiente para reconstruir a decisão
 * sem duplicar o texto das mensagens (que já está em Message).
 */
export function contextSnapshot(context: AgentContext) {
  return {
    mode: context.mode,
    status: context.status,
    nowSaoPaulo: context.nowSaoPaulo,
    customerNameKnown: context.customerName !== null,
    messageIds: context.messages.map((message) => message.id),
    promotionIds: context.promotions.map((promotion) => promotion.id),
    upcomingConfirmedBooking: context.upcomingConfirmedBooking !== null,
    unknowns: context.unknowns,
    policy: context.policy,
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
      const price = promotion.priceBrl !== null ? `: R$ ${promotion.priceBrl}` : "";
      lines.push(
        `- ${promotion.name}${price}. Regras: ${promotion.rules.join("; ")}. Válida até ${promotion.endsOn}. A equipe confirma o enquadramento.`,
      );
    }
  }

  lines.push("", "## Desconhecido para você (NÃO invente; encaminhe ou explique que a equipe informa)");
  for (const item of context.unknowns) lines.push(`- ${item}`);

  return lines.join("\n");
}
