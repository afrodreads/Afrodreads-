import { prisma } from "../prisma";
import type { MessageRecord } from "../conversations/types";
import type { SecureUnitSettings, UnitConfigProvider } from "../agent/config";
import { CONTEXT_MESSAGE_LIMIT, modeFromLastTransition, type AgentContextReader } from "../agent/context";
import { promotionSchema, type Promotion, type PromotionsProvider } from "../agent/promotions";
import type { SystemEventDataReader } from "../agent/systemEvents";
import { dateKeyOf, stringList } from "./shared";

// Leitores (somente leitura) do banco para o agente e para o SYSTEM.
// Nenhum deles seleciona preço de serviço, valor de orçamento ou de agendamento:
// o agente não recebe preço.

/** Configuração pública da unidade + links públicos da MARCA (separados). */
export const prismaUnitConfigProvider: UnitConfigProvider = {
  async get(unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        brand: { select: { publicLinks: true } },
        staff: { where: { active: true, role: "ATTENDANT" }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true } },
      },
    });
    if (!unit || !unit.active) return null;
    const brandLinks = stringList(unit.brand?.publicLinks);
    return {
      unitId: unit.id,
      displayName: unit.name,
      publicArea: unit.publicArea,
      humanHoursText: unit.humanHoursText,
      humanName: unit.staff[0]?.name ?? null,
      reviewUrl: unit.reviewUrl,
      parkingInfo: unit.parkingInfo,
      allowedUrls: [...brandLinks, ...(unit.reviewUrl ? [unit.reviewUrl] : [])],
    };
  },
};

/** Endereço e mapa: só para o SYSTEM, só se os dois estiverem cadastrados. */
export const prismaSecureUnitSettings: SecureUnitSettings = {
  async getLocation(unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { address: true, mapUrl: true } });
    const address = unit?.address?.trim();
    const mapUrl = unit?.mapUrl?.trim();
    return address && mapUrl ? { address, mapUrl } : null;
  },
};

export const prismaPromotionsProvider: PromotionsProvider = {
  async list(unitId) {
    const rows = await prisma.promotion.findMany({
      where: { unitId },
      include: { service: { select: { slug: true } } },
      orderBy: { endsOn: "asc" },
    });
    const promotions: Promotion[] = [];
    for (const row of rows) {
      const parsed = promotionSchema.safeParse({
        id: row.id,
        unitId: row.unitId,
        name: row.name,
        active: row.active,
        startsOn: row.startsOn ? dateKeyOf(row.startsOn) : null,
        endsOn: dateKeyOf(row.endsOn),
        priceBrl: row.priceBrl === null ? null : Number(row.priceBrl),
        rules: stringList(row.rules),
        conditions: row.conditions && typeof row.conditions === "object" && !Array.isArray(row.conditions) ? row.conditions : null,
        serviceSlug: row.service?.slug ?? null,
        requiresStaffConfirmation: row.requiresStaffConfirmation,
      });
      // Cadastro malformado não vira promoção para o agente (fica desconhecida).
      if (parsed.success) promotions.push(parsed.data);
    }
    return promotions;
  },
};

type ReaderDeps = { units: UnitConfigProvider; promotions: PromotionsProvider };

export function prismaAgentContextReader(deps: ReaderDeps): AgentContextReader & {
  findMessage(id: string): Promise<{ id: string; conversationId: string; sender: string; createdAt: Date } | null>;
} {
  return {
    findMessage: (id) =>
      prisma.message.findUnique({ where: { id }, select: { id: true, conversationId: true, sender: true, createdAt: true } }),

    async load(conversationId, options = {}) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { customer: { select: { name: true } } },
      });
      if (!conversation) return null;

      let upTo: Date | null = null;
      if (options.upToMessageId) {
        const trigger = await prisma.message.findFirst({
          where: { id: options.upToMessageId, conversationId },
          select: { createdAt: true },
        });
        if (!trigger) return null;
        upTo = trigger.createdAt;
      }
      const until = upTo ? { createdAt: { lte: upTo } } : {};

      const recent = await prisma.message.findMany({
        where: { conversationId, ...until },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: CONTEXT_MESSAGE_LIMIT * 2,
      });
      let messages = recent.reverse() as MessageRecord[];
      if (options.upToMessageId) {
        const index = messages.findIndex((message) => message.id === options.upToMessageId);
        messages = index === -1 ? messages : messages.slice(0, index + 1);
      }

      const reference = upTo ?? new Date();
      const [outboundMessageCount, lastTransition, activeHandoff, unit, promotions, booking] = await Promise.all([
        prisma.message.count({ where: { conversationId, direction: "OUTBOUND", ...until } }),
        prisma.conversationTransition.findFirst({ where: { conversationId, ...until }, orderBy: { createdAt: "desc" } }),
        prisma.handoff.findFirst({
          where: { conversationId, status: { in: ["OPEN", "CLAIMED"] } },
          orderBy: { createdAt: "desc" },
        }),
        deps.units.get(conversation.unitId),
        deps.promotions.list(conversation.unitId),
        prisma.booking.findFirst({
          where: {
            customerId: conversation.customerId,
            status: "CONFIRMED",
            scheduledStart: { gt: reference },
            createdAt: { lte: reference },
          },
          orderBy: { scheduledStart: "asc" },
          // Só data e nome do serviço: nada de valores.
          select: { scheduledStart: true, service: { select: { name: true } } },
        }),
      ]);
      if (!unit) return null;

      return {
        conversation,
        unitId: conversation.unitId,
        customerName: conversation.customer.name,
        unit,
        promotions,
        recentMessages: messages,
        outboundMessageCount,
        lastTransition,
        activeHandoff,
        upcomingConfirmedBooking: booking ? { startsAt: booking.scheduledStart, serviceName: booking.service.name } : null,
        modeAtTrigger: modeFromLastTransition(lastTransition),
      };
    },
  };
}

/** Dados confiáveis para os eventos SYSTEM (status do banco, tipo de atendimento, unidade). */
export function prismaSystemEventReader(deps: { units: UnitConfigProvider }): SystemEventDataReader {
  const latestConversation = (customerId: string) =>
    prisma.conversation.findFirst({
      where: { customerId, channel: "WHATSAPP" },
      orderBy: [{ lastContactAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      select: { id: true, mode: true, unitId: true },
    });

  return {
    async load(event) {
      if (event.type === "PAYMENT_CONFIRMED") {
        const booking = await prisma.booking.findUnique({
          where: { id: event.entityId },
          select: {
            status: true,
            appointmentType: true,
            unitId: true,
            customerId: true,
            clientName: true,
            customer: { select: { name: true } },
          },
        });
        if (!booking) return null;
        const conversation = booking.customerId ? await latestConversation(booking.customerId) : null;
        const unitId = booking.unitId ?? conversation?.unitId ?? event.unitId;
        if (!unitId) return null;
        return {
          unitId,
          conversationId: conversation?.id ?? null,
          conversationMode: conversation?.mode ?? null,
          customerName: booking.customer?.name ?? booking.clientName,
          bookingStatus: booking.status,
          appointmentType: booking.appointmentType,
          unit: await deps.units.get(unitId),
        };
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: event.entityId },
        select: { id: true, mode: true, unitId: true, customerId: true, customer: { select: { name: true } } },
      });
      if (!conversation) return null;
      const bookingId = typeof event.payload.bookingId === "string" ? event.payload.bookingId : null;
      const booking = bookingId
        ? await prisma.booking.findUnique({ where: { id: bookingId }, select: { appointmentType: true, customerId: true } })
        : await prisma.booking.findFirst({
            where: { customerId: conversation.customerId, status: { in: ["CONFIRMED", "COMPLETED"] } },
            orderBy: { scheduledStart: "desc" },
            select: { appointmentType: true, customerId: true },
          });
      // Um agendamento de outro cliente nunca define o tipo de atendimento.
      const appointmentType = booking && booking.customerId === conversation.customerId ? booking.appointmentType : null;
      return {
        unitId: conversation.unitId,
        conversationId: conversation.id,
        conversationMode: conversation.mode,
        customerName: conversation.customer.name,
        bookingStatus: null,
        appointmentType,
        unit: await deps.units.get(conversation.unitId),
      };
    },
  };
}
