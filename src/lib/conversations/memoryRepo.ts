import { UniqueConflictError } from "./errors";
import type {
  BookingForLink,
  ConversationsRepo,
  ConversationsStore,
  NewHandoff,
  NewMessage,
  NewTransition,
} from "./repo";
import type {
  ConversationRecord,
  CustomerRecord,
  HandoffRecord,
  MessageRecord,
  TransitionRecord,
  UnitRecord,
} from "./types";

// Banco em memória SÓ para testes: implementa as mesmas garantias que o
// adaptador do Prisma (unicidade, operações condicionais atômicas) para as
// regras serem testadas sem banco. Não é importado pelo aplicativo.
//
// Não emula rollback de transação: os serviços fazem a escrita que pode falhar
// por unicidade antes das demais, e os testes conferem esse comportamento.

type Handoff = HandoffRecord;

export class MemoryConversations implements ConversationsStore {
  units: UnitRecord[] = [];
  customers: CustomerRecord[] = [];
  conversations: ConversationRecord[] = [];
  messages: MessageRecord[] = [];
  handoffs: Handoff[] = [];
  transitions: TransitionRecord[] = [];
  bookings: BookingForLink[] = [];

  private seq = 0;
  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  // ---- preparação dos testes ----
  addUnit(data: Partial<UnitRecord> & { slug: string }): UnitRecord {
    const unit: UnitRecord = {
      id: this.nextId("unit"),
      name: data.slug,
      timezone: "America/Sao_Paulo",
      active: true,
      ...data,
    };
    this.units.push(unit);
    return unit;
  }

  addBooking(data: Partial<BookingForLink> = {}): BookingForLink {
    const booking: BookingForLink = {
      id: this.nextId("booking"),
      clientName: "Cliente",
      clientPhone: "11987654321",
      customerId: null,
      unitId: null,
      ...data,
    };
    this.bookings.push(booking);
    return booking;
  }

  transaction<T>(fn: (repo: ConversationsRepo) => Promise<T>): Promise<T> {
    return fn(this.repo);
  }

  private repo: ConversationsRepo = {
    findUnitById: async (id) => this.units.find((u) => u.id === id) ?? null,
    findUnitBySlug: async (slug) => this.units.find((u) => u.slug === slug) ?? null,
    listActiveUnits: async () => this.units.filter((u) => u.active),

    findCustomerByPhone: async (unitId, phone) =>
      this.customers.find((c) => c.unitId === unitId && c.phone === phone) ?? null,
    createCustomer: async (data) => {
      if (this.customers.some((c) => c.unitId === data.unitId && c.phone === data.phone)) {
        throw new UniqueConflictError();
      }
      const customer: CustomerRecord = { id: this.nextId("customer"), ...data };
      this.customers.push(customer);
      return { ...customer };
    },
    setCustomerNameIfEmpty: async (customerId, name) => {
      const customer = this.customers.find((c) => c.id === customerId);
      if (customer && !customer.name) customer.name = name;
    },

    findConversationById: async (id) => {
      const found = this.conversations.find((c) => c.id === id);
      return found ? { ...found } : null;
    },
    findConversationByExternalId: async (unitId, channel, externalId) => {
      const found = this.conversations.find(
        (c) => c.unitId === unitId && c.channel === channel && c.externalId === externalId,
      );
      return found ? { ...found } : null;
    },
    findLatestConversation: async (customerId, channel) => {
      const mine = this.conversations.filter((c) => c.customerId === customerId && c.channel === channel);
      const latest = mine[mine.length - 1];
      return latest ? { ...latest } : null;
    },
    createConversation: async (data) => {
      if (
        data.externalId &&
        this.conversations.some(
          (c) => c.unitId === data.unitId && c.channel === data.channel && c.externalId === data.externalId,
        )
      ) {
        throw new UniqueConflictError();
      }
      const conversation: ConversationRecord = {
        id: this.nextId("conversation"),
        unitId: data.unitId,
        customerId: data.customerId,
        channel: data.channel,
        externalId: data.externalId,
        mode: "BOT",
        assignedTo: null,
        lastContactAt: null,
      };
      this.conversations.push(conversation);
      return { ...conversation };
    },
    touchConversation: async (id, at) => {
      const c = this.conversations.find((x) => x.id === id);
      if (c && (!c.lastContactAt || c.lastContactAt < at)) c.lastContactAt = at;
    },
    touchIfMode: async (id, mode, at) => {
      const c = this.conversations.find((x) => x.id === id && x.mode === mode);
      if (!c) return false;
      c.lastContactAt = at;
      return true;
    },
    changeMode: async (id, from, to, assignedTo) => {
      const c = this.conversations.find((x) => x.id === id && x.mode === from);
      if (!c) return false;
      c.mode = to;
      c.assignedTo = assignedTo;
      return true;
    },
    setAssignedTo: async (id, assignedTo) => {
      const c = this.conversations.find((x) => x.id === id);
      if (c) c.assignedTo = assignedTo;
    },

    addTransition: async (data: NewTransition) => {
      this.transitions.push({ id: this.nextId("transition"), ...data });
    },
    createHandoff: async (data: NewHandoff) => {
      const handoff: Handoff = {
        id: this.nextId("handoff"),
        conversationId: data.conversationId,
        reason: data.reason,
        summary: data.summary,
        status: data.claimedBy ? "CLAIMED" : "OPEN",
        requestedBy: data.requestedBy,
        requestedByRef: data.requestedByRef,
        claimedBy: data.claimedBy,
        claimedAt: data.claimedAt,
        resolvedAt: null,
      };
      this.handoffs.push(handoff);
      return { ...handoff };
    },
    findActiveHandoff: async (conversationId) => {
      const active = this.handoffs.filter(
        (h) => h.conversationId === conversationId && (h.status === "OPEN" || h.status === "CLAIMED"),
      );
      const latest = active[active.length - 1];
      return latest ? { ...latest } : null;
    },
    claimHandoff: async (id, by, at) => {
      const h = this.handoffs.find((x) => x.id === id && x.status === "OPEN");
      if (!h) return false;
      h.status = "CLAIMED";
      h.claimedBy = by;
      h.claimedAt = at;
      return true;
    },
    resolveActiveHandoffs: async (conversationId, at) => {
      let count = 0;
      for (const h of this.handoffs) {
        if (h.conversationId === conversationId && (h.status === "OPEN" || h.status === "CLAIMED")) {
          h.status = "RESOLVED";
          h.resolvedAt = at;
          count += 1;
        }
      }
      return count;
    },

    findMessageByExternalId: async (unitId, channel, externalId) => {
      const found = this.messages.find((m) => {
        if (m.externalId !== externalId) return false;
        const conversation = this.conversations.find((c) => c.id === m.conversationId);
        return conversation?.unitId === unitId && conversation.channel === channel;
      });
      return found ? { ...found } : null;
    },
    createMessage: async (data: NewMessage) => {
      if (
        data.externalId &&
        this.messages.some((m) => m.conversationId === data.conversationId && m.externalId === data.externalId)
      ) {
        throw new UniqueConflictError();
      }
      const message: MessageRecord = { id: this.nextId("message"), ...data };
      this.messages.push(message);
      return { ...message };
    },

    findBookingForLink: async (bookingId) => {
      const found = this.bookings.find((b) => b.id === bookingId);
      return found ? { ...found } : null;
    },
    linkBooking: async (bookingId, customerId, unitId) => {
      const booking = this.bookings.find((b) => b.id === bookingId && b.customerId === null);
      if (!booking) return false;
      booking.customerId = customerId;
      booking.unitId = unitId;
      return true;
    },
  };
}
