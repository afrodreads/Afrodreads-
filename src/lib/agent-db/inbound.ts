import { prisma } from "../prisma";
import { resolveUnit } from "../conversations/unit";
import { prismaConversationsStore } from "../conversations/prismaRepo";
import type { GroupingReader } from "../agent/grouping";
import type { OpeningState } from "../agent-http/inbound";

// Consultas de banco usadas pela entrada do agente (somente leitura).

export const prismaGroupingReader: GroupingReader = {
  async pendingCustomerMessages(conversationId) {
    const lastOutbound = await prisma.message.findFirst({
      where: { conversationId, direction: "OUTBOUND" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return prisma.message.findMany({
      where: {
        conversationId,
        sender: "CUSTOMER",
        ...(lastOutbound ? { createdAt: { gt: lastOutbound.createdAt } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, createdAt: true },
      take: 50,
    });
  },
};

/** Mensagens recebidas de um contato do canal, nesta unidade, desde `since`. */
export function countRecentInboundForContact(unitId: string, contactId: string, since: Date): Promise<number> {
  return prisma.message.count({
    where: {
      direction: "INBOUND",
      createdAt: { gte: since },
      conversation: { unitId, channel: "WHATSAPP", externalId: contactId },
    },
  });
}

/** Sufixo de uma conversa de teste "zerada": o id externo vira `<contato>#arquivo-<n>`. */
export const ARCHIVED_SUFFIX = "#arquivo-";

/**
 * Última mensagem do cliente (deste contato) e se já existe resposta enviada depois dela.
 * Olha também as conversas arquivadas do contato: o ManyChat continua mandando o último
 * texto antigo junto com uma foto, e sem esse histórico ele pareceria mensagem nova.
 */
export async function lastInboundForContact(
  unitId: string,
  contactId: string,
): Promise<{ text: string; answered: boolean } | null> {
  const conversation = {
    unitId,
    channel: "WHATSAPP" as const,
    OR: [{ externalId: contactId }, { externalId: { startsWith: `${contactId}${ARCHIVED_SUFFIX}` } }],
  };
  const last = await prisma.message.findFirst({
    where: { direction: "INBOUND", conversation },
    orderBy: { createdAt: "desc" },
    select: { content: true, createdAt: true, conversationId: true },
  });
  if (!last) return null;
  const replyAfter = await prisma.message.findFirst({
    where: { conversationId: last.conversationId, direction: "OUTBOUND", createdAt: { gte: last.createdAt } },
    select: { id: true },
  });
  return { text: last.content, answered: replyAfter !== null };
}

/** Última mensagem enviada na conversa e o que o cliente mandou depois dela (abertura rápida). */
export async function openingStateForConversation(conversationId: string): Promise<OpeningState> {
  const lastOutbound = await prisma.message.findFirst({
    where: { conversationId, direction: "OUTBOUND" },
    orderBy: { createdAt: "desc" },
    select: { content: true, createdAt: true, sender: true },
  });
  const pending = await prisma.message.findMany({
    where: {
      conversationId,
      sender: "CUSTOMER",
      ...(lastOutbound ? { createdAt: { gt: lastOutbound.createdAt } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { content: true },
    take: 20,
  });
  return {
    anyOutbound: lastOutbound !== null,
    lastAiText: lastOutbound?.sender === "AI" ? lastOutbound.content : null,
    pending: pending.map((message) => message.content),
  };
}

/** Se a mídia (id `media:...`) já foi registrada para este contato. */
export async function mediaMessageExists(unitId: string, contactId: string, externalMessageId: string): Promise<boolean> {
  const found = await prisma.message.findFirst({
    where: { externalId: externalMessageId, conversation: { unitId, channel: "WHATSAPP", externalId: contactId } },
    select: { id: true },
  });
  return found !== null;
}

/** Unidade pela configuração (slug) ou a única ativa. Nunca pelo payload. */
export async function resolveInboundUnitId(slug: string | null): Promise<string | null> {
  try {
    const unit = await prismaConversationsStore.transaction((repo) => resolveUnit(repo, { slug }));
    return unit.id;
  } catch (error) {
    // Só o tipo do erro (nunca a mensagem, que pode trazer dados de conexão): sem isso o 503 não tem pista.
    const code = (error as { errorCode?: unknown; code?: unknown } | null)?.errorCode ?? (error as { code?: unknown } | null)?.code;
    console.error("agent_inbound_unit_lookup_failed", {
      name: error instanceof Error ? error.name : "Error",
      code: typeof code === "string" ? code : null,
    });
    return null;
  }
}
