// Tipos de domínio da fundação do agente. São uniões de strings (e não os
// enums do Prisma) para os módulos de regra ficarem independentes do banco;
// os valores são os mesmos do schema.prisma.

export type ConversationChannel = "WHATSAPP";
export type ConversationMode = "BOT" | "HUMAN" | "FINISHED";
export type ActorType = "AI" | "HUMAN" | "SYSTEM";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageSender = "CUSTOMER" | "AI" | "HUMAN" | "SYSTEM";
export type HandoffStatus = "OPEN" | "CLAIMED" | "RESOLVED";
export type HandoffReason =
  | "CUSTOMER_REQUEST"
  | "QUOTE_REQUEST"
  | "SCHEDULING"
  | "PAYMENT"
  | "CANCELLATION_OR_REFUND"
  | "COMPLAINT_OR_HEALTH"
  | "AGE_POLICY"
  | "OUT_OF_SCOPE"
  | "AI_UNCERTAIN"
  | "INTAKE_COMPLETE"
  | "HUMAN_TAKEOVER"
  | "OTHER";

export const HANDOFF_REASONS: readonly HandoffReason[] = [
  "CUSTOMER_REQUEST",
  "QUOTE_REQUEST",
  "SCHEDULING",
  "PAYMENT",
  "CANCELLATION_OR_REFUND",
  "COMPLAINT_OR_HEALTH",
  "AGE_POLICY",
  "OUT_OF_SCOPE",
  "AI_UNCERTAIN",
  "INTAKE_COMPLETE",
  "HUMAN_TAKEOVER",
  "OTHER",
];

/** Quem está agindo (a IA, uma pessoa da equipe ou o próprio sistema). */
export type Actor = { type: ActorType; ref?: string };

export type UnitRecord = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  active: boolean;
};

export type CustomerRecord = {
  id: string;
  unitId: string;
  phone: string;
  name: string | null;
};

export type ConversationRecord = {
  id: string;
  unitId: string;
  customerId: string;
  channel: ConversationChannel;
  externalId: string | null;
  mode: ConversationMode;
  assignedTo: string | null;
  lastContactAt: Date | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  sender: MessageSender;
  senderRef: string | null;
  content: string;
  externalId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type HandoffRecord = {
  id: string;
  conversationId: string;
  reason: HandoffReason;
  summary: unknown;
  status: HandoffStatus;
  requestedBy: ActorType;
  requestedByRef: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  resolvedAt: Date | null;
};

export type TransitionRecord = {
  id: string;
  conversationId: string;
  fromMode: ConversationMode;
  toMode: ConversationMode;
  actor: ActorType;
  actorRef: string | null;
  reason: string | null;
  handoffId: string | null;
  createdAt: Date;
};
