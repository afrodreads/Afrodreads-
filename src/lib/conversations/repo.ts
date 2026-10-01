import type {
  ActorType,
  ConversationChannel,
  ConversationMode,
  ConversationRecord,
  CustomerRecord,
  HandoffReason,
  HandoffRecord,
  MessageDirection,
  MessageRecord,
  MessageSender,
  UnitRecord,
} from "./types";

// Fronteira entre as regras (testáveis com um banco em memória) e o Prisma.
// Mesmo padrão da Fase 0: ROTA → SERVIÇO/REGRA → BANCO.
//
// Convenções que o adaptador do banco precisa respeitar:
//  - `create*` lança UniqueConflictError quando a restrição de unicidade falha;
//  - `changeMode`, `claimHandoff`, `linkBooking` e `touchIfMode` são atômicos e
//    devolvem `false` quando a condição não vale mais (quem chegou depois perde).

export type NewMessage = {
  conversationId: string;
  direction: MessageDirection;
  sender: MessageSender;
  senderRef: string | null;
  content: string;
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type NewHandoff = {
  conversationId: string;
  reason: HandoffReason;
  summary: unknown;
  requestedBy: ActorType;
  requestedByRef: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
};

export type NewTransition = {
  conversationId: string;
  fromMode: ConversationMode;
  toMode: ConversationMode;
  actor: ActorType;
  actorRef: string | null;
  reason: string | null;
  handoffId: string | null;
  createdAt: Date;
};

export type BookingForLink = {
  id: string;
  clientName: string;
  clientPhone: string;
  customerId: string | null;
  unitId: string | null;
};

export interface ConversationsRepo {
  // Unidades
  findUnitById(id: string): Promise<UnitRecord | null>;
  findUnitBySlug(slug: string): Promise<UnitRecord | null>;
  listActiveUnits(): Promise<UnitRecord[]>;

  // Clientes
  findCustomerByPhone(unitId: string, phone: string): Promise<CustomerRecord | null>;
  createCustomer(data: { unitId: string; phone: string; name: string | null }): Promise<CustomerRecord>;
  setCustomerNameIfEmpty(customerId: string, name: string): Promise<void>;

  // Conversas
  findConversationById(id: string): Promise<ConversationRecord | null>;
  findConversationByExternalId(
    unitId: string,
    channel: ConversationChannel,
    externalId: string,
  ): Promise<ConversationRecord | null>;
  findLatestConversation(
    customerId: string,
    channel: ConversationChannel,
  ): Promise<ConversationRecord | null>;
  createConversation(data: {
    unitId: string;
    customerId: string;
    channel: ConversationChannel;
    externalId: string | null;
    createdAt: Date;
  }): Promise<ConversationRecord>;
  /** Atualiza o último contato (nunca para trás). */
  touchConversation(id: string, at: Date): Promise<void>;
  /** Como touchConversation, mas só se a conversa ainda está em `mode`. */
  touchIfMode(id: string, mode: ConversationMode, at: Date): Promise<boolean>;
  /** Troca o modo só se ainda for `from`. */
  changeMode(
    id: string,
    from: ConversationMode,
    to: ConversationMode,
    assignedTo: string | null,
  ): Promise<boolean>;
  setAssignedTo(id: string, assignedTo: string | null): Promise<void>;

  // Auditoria e encaminhamentos
  addTransition(data: NewTransition): Promise<void>;
  createHandoff(data: NewHandoff): Promise<HandoffRecord>;
  findActiveHandoff(conversationId: string): Promise<HandoffRecord | null>;
  claimHandoff(id: string, by: string, at: Date): Promise<boolean>;
  resolveActiveHandoffs(conversationId: string, at: Date): Promise<number>;

  // Mensagens
  findMessageByExternalId(
    unitId: string,
    channel: ConversationChannel,
    externalId: string,
  ): Promise<MessageRecord | null>;
  createMessage(data: NewMessage): Promise<MessageRecord>;

  // Vínculo com agendamentos
  findBookingForLink(bookingId: string): Promise<BookingForLink | null>;
  /** Só vincula se o agendamento ainda não tem cliente. */
  linkBooking(bookingId: string, customerId: string, unitId: string): Promise<boolean>;
}

export interface ConversationsStore {
  transaction<T>(fn: (repo: ConversationsRepo) => Promise<T>): Promise<T>;
}
