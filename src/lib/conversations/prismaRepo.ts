import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { UniqueConflictError } from "./errors";
import type { ConversationsRepo, ConversationsStore } from "./repo";
import type { HandoffRecord, UnitRecord } from "./types";

// Adaptador de produção (Prisma) da fronteira definida em repo.ts. Aqui não há
// regra de negócio: só traduzir chamadas para o banco e P2002 para
// UniqueConflictError. A lógica vive nos serviços, testados com banco em memória.

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function mapUnique<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isUniqueViolation(error)) throw new UniqueConflictError();
    throw error;
  }
}

const unitSelect = { id: true, slug: true, name: true, timezone: true, active: true } as const;

function asHandoff(row: {
  id: string;
  conversationId: string;
  reason: HandoffRecord["reason"];
  summary: Prisma.JsonValue;
  status: HandoffRecord["status"];
  requestedBy: HandoffRecord["requestedBy"];
  requestedByRef: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  resolvedAt: Date | null;
}): HandoffRecord {
  return row;
}

function makeRepo(db: Prisma.TransactionClient): ConversationsRepo {
  return {
    findUnitById: (id) => db.unit.findUnique({ where: { id }, select: unitSelect }),
    findUnitBySlug: (slug) => db.unit.findUnique({ where: { slug }, select: unitSelect }),
    listActiveUnits: (): Promise<UnitRecord[]> =>
      db.unit.findMany({ where: { active: true }, select: unitSelect, orderBy: { createdAt: "asc" } }),

    findCustomerByPhone: (unitId, phone) =>
      db.customer.findUnique({ where: { unitId_phone: { unitId, phone } } }),
    createCustomer: (data) => mapUnique(db.customer.create({ data })),
    async setCustomerNameIfEmpty(customerId, name) {
      await db.customer.updateMany({ where: { id: customerId, name: null }, data: { name } });
    },

    findConversationById: (id) => db.conversation.findUnique({ where: { id } }),
    findConversationByExternalId: (unitId, channel, externalId) =>
      db.conversation.findUnique({
        where: { unitId_channel_externalId: { unitId, channel, externalId } },
      }),
    findLatestConversation: (customerId, channel) =>
      db.conversation.findFirst({
        where: { customerId, channel },
        orderBy: [{ lastContactAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      }),
    createConversation: (data) => mapUnique(db.conversation.create({ data })),
    async touchConversation(id, at) {
      // Nunca anda para trás: só atualiza se ainda não há contato mais recente.
      await db.conversation.updateMany({
        where: { id, OR: [{ lastContactAt: null }, { lastContactAt: { lt: at } }] },
        data: { lastContactAt: at },
      });
    },
    async touchIfMode(id, mode, at) {
      // O filtro por modo faz desta escrita a trava: se a conversa já passou
      // para HUMAN/FINISHED, nenhuma linha casa e devolvemos false.
      const { count } = await db.conversation.updateMany({
        where: { id, mode },
        data: { lastContactAt: at },
      });
      return count > 0;
    },
    async changeMode(id, from, to, assignedTo) {
      const { count } = await db.conversation.updateMany({
        where: { id, mode: from },
        data: { mode: to, assignedTo },
      });
      return count > 0;
    },
    async setAssignedTo(id, assignedTo) {
      await db.conversation.update({ where: { id }, data: { assignedTo } });
    },

    async addTransition(data) {
      await db.conversationTransition.create({ data });
    },
    async createHandoff(data) {
      const row = await db.handoff.create({
        data: {
          conversationId: data.conversationId,
          reason: data.reason,
          summary: data.summary as Prisma.InputJsonValue,
          status: data.claimedBy ? "CLAIMED" : "OPEN",
          requestedBy: data.requestedBy,
          requestedByRef: data.requestedByRef,
          claimedBy: data.claimedBy,
          claimedAt: data.claimedAt,
        },
      });
      return asHandoff(row);
    },
    async findActiveHandoff(conversationId) {
      const row = await db.handoff.findFirst({
        where: { conversationId, status: { in: ["OPEN", "CLAIMED"] } },
        orderBy: { createdAt: "desc" },
      });
      return row ? asHandoff(row) : null;
    },
    async claimHandoff(id, by, at) {
      const { count } = await db.handoff.updateMany({
        where: { id, status: "OPEN" },
        data: { status: "CLAIMED", claimedBy: by, claimedAt: at },
      });
      return count > 0;
    },
    async resolveActiveHandoffs(conversationId, at) {
      const { count } = await db.handoff.updateMany({
        where: { conversationId, status: { in: ["OPEN", "CLAIMED"] } },
        data: { status: "RESOLVED", resolvedAt: at },
      });
      return count;
    },

    findMessageByExternalId: (unitId, channel, externalId) =>
      db.message.findFirst({
        where: { externalId, conversation: { unitId, channel } },
      }),
    createMessage: (data) =>
      mapUnique(
        db.message.create({
          data: {
            ...data,
            metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
          },
        }),
      ),

    findBookingForLink: (bookingId) =>
      db.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, clientName: true, clientPhone: true, customerId: true, unitId: true },
      }),
    async linkBooking(bookingId, customerId, unitId) {
      const { count } = await db.booking.updateMany({
        where: { id: bookingId, customerId: null },
        data: { customerId, unitId },
      });
      return count > 0;
    },
  };
}

export const prismaConversationsStore: ConversationsStore = {
  transaction: (fn) => prisma.$transaction((tx) => fn(makeRepo(tx))),
};
