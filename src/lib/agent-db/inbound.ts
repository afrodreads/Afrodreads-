import { prisma } from "../prisma";
import { resolveUnit } from "../conversations/unit";
import { prismaConversationsStore } from "../conversations/prismaRepo";
import type { GroupingReader } from "../agent/grouping";

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
