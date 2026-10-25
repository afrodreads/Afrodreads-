import { z } from "zod";
import { findOrCreateConversation, applyTransition } from "./conversation";
import { findOrCreateCustomer } from "./customer";
import {
  AiResponseBlockedError,
  ConversationNotFoundError,
  InvalidInputError,
  InvalidPhoneError,
  UniqueConflictError,
} from "./errors";
import { normalizePhone } from "./phone";
import type { ConversationsStore } from "./repo";
import { canAiRespond } from "./stateMachine";
import type { ConversationChannel, ConversationMode, MessageRecord } from "./types";
import { resolveUnit } from "./unit";

// Registro de mensagens. Guardamos o mínimo para reconstruir o contexto da
// conversa: texto, quem falou, quando, e o identificador do canal (para a mesma
// mensagem entregue duas vezes não virar duas linhas). Nunca o payload bruto.

export const MAX_MESSAGE_LENGTH = 4000;
const MAX_METADATA_BYTES = 1000;

const metadataSchema = z
  .record(z.string().min(1).max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
  .refine((value) => JSON.stringify(value).length <= MAX_METADATA_BYTES, "Metadados grandes demais");

const content = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH);
const externalMessageId = z.string().trim().min(1).max(200);

const inboundSchema = z.object({
  unitId: z.string().min(1).max(64),
  channel: z.literal("WHATSAPP").default("WHATSAPP"),
  phone: z.string().max(40),
  customerName: z.string().max(200).nullish(),
  externalConversationId: z.string().trim().min(1).max(200).optional(),
  externalMessageId: externalMessageId.optional(),
  content,
  metadata: metadataSchema.optional(),
  sentAt: z.date().optional(),
});

const outboundSchema = z.object({
  conversationId: z.string().min(1).max(64),
  sender: z.enum(["AI", "HUMAN", "SYSTEM"]),
  senderRef: z.string().trim().min(1).max(80).optional(),
  externalMessageId: externalMessageId.optional(),
  content,
  metadata: metadataSchema.optional(),
});

export type InboundMessageInput = z.input<typeof inboundSchema>;
export type OutboundMessageInput = z.input<typeof outboundSchema>;

export type InboundMessageResult = {
  /** true quando este identificador externo já tinha sido registrado. */
  duplicate: boolean;
  messageId: string;
  conversationId: string;
  customerId: string;
  mode: ConversationMode;
  /** A conversa foi reaberta (FINISHED → BOT) por causa desta mensagem. */
  reopened: boolean;
  /** Se a IA pode responder agora (só em BOT). */
  aiMayRespond: boolean;
};

function parseOrThrow<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidInputError(parsed.error.issues[0]?.message ?? "Mensagem inválida.");
  }
  return parsed.data;
}

/** A hora do canal só vale se não for do futuro. */
function messageTime(sentAt: Date | undefined, now: Date): Date {
  if (sentAt && !Number.isNaN(sentAt.getTime()) && sentAt.getTime() <= now.getTime()) return sentAt;
  return now;
}

/**
 * Recebe uma mensagem do cliente: acha/cria o cliente e a conversa, grava a
 * mensagem e atualiza o último contato. É idempotente por `externalMessageId`.
 *
 * Se a conversa estava FINISHED, é reaberta (FINISHED → BOT) com registro de
 * auditoria. Se estava em HUMAN, continua em HUMAN: a mensagem é guardada e a
 * IA NÃO responde (`aiMayRespond: false`).
 */
export async function receiveInboundMessage(
  store: ConversationsStore,
  rawInput: InboundMessageInput,
  now: Date = new Date(),
): Promise<InboundMessageResult> {
  const input = parseOrThrow(inboundSchema, rawInput);
  const channel: ConversationChannel = input.channel;

  if (!normalizePhone(input.phone)) throw new InvalidPhoneError();

  const unit = await store.transaction((repo) => resolveUnit(repo, { unitId: input.unitId }));

  const existingDuplicate = async (): Promise<InboundMessageResult | null> => {
    if (!input.externalMessageId) return null;
    const externalId = input.externalMessageId;
    return store.transaction(async (repo) => {
      const message = await repo.findMessageByExternalId(unit.id, channel, externalId);
      if (!message) return null;
      const conversation = await repo.findConversationById(message.conversationId);
      if (!conversation) return null;
      return {
        duplicate: true,
        messageId: message.id,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        mode: conversation.mode,
        reopened: false,
        aiMayRespond: canAiRespond(conversation.mode),
      };
    });
  };

  const duplicate = await existingDuplicate();
  if (duplicate) return duplicate;

  // A conversa do identificador externo manda; só sem ela olhamos o telefone.
  let conversation = input.externalConversationId
    ? await store.transaction((repo) =>
        repo.findConversationByExternalId(unit.id, channel, input.externalConversationId as string),
      )
    : null;

  if (!conversation) {
    const { customer } = await findOrCreateCustomer(store, {
      unitId: unit.id,
      phone: input.phone,
      name: input.customerName,
    });
    ({ conversation } = await findOrCreateConversation(store, {
      unitId: unit.id,
      customer,
      channel,
      externalId: input.externalConversationId ?? null,
      now,
    }));
  }

  const conversationId = conversation.id;
  const createdAt = messageTime(input.sentAt, now);

  try {
    return await store.transaction(async (repo) => {
      const message = await repo.createMessage({
        conversationId,
        direction: "INBOUND",
        sender: "CUSTOMER",
        senderRef: null,
        content: input.content,
        externalId: input.externalMessageId ?? null,
        metadata: input.metadata ?? null,
        createdAt,
      });
      await repo.touchConversation(conversationId, createdAt);

      // Relê dentro da transação: o modo pode ter mudado desde a leitura acima.
      const fresh = await repo.findConversationById(conversationId);
      if (!fresh) throw new ConversationNotFoundError();

      let mode = fresh.mode;
      let reopened = false;
      if (mode === "FINISHED") {
        await applyTransition(repo, {
          conversationId,
          to: "BOT",
          actor: { type: "SYSTEM" },
          reason: "Cliente escreveu depois do atendimento finalizado",
          now,
        });
        mode = "BOT";
        reopened = true;
      }

      return {
        duplicate: false,
        messageId: message.id,
        conversationId,
        customerId: fresh.customerId,
        mode,
        reopened,
        aiMayRespond: canAiRespond(mode),
      };
    });
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      // Outra entrega da mesma mensagem venceu a corrida.
      const winner = await existingDuplicate();
      if (winner) return winner;
    }
    throw error;
  }
}

export type OutboundMessageResult = { duplicate: boolean; messageId: string };

/**
 * Registra uma mensagem enviada (pela IA, por uma pessoa ou pelo sistema).
 * Isto só GRAVA; nada aqui envia para o cliente.
 *
 * Trava de segurança: mensagem da IA só é aceita com a conversa em BOT. A
 * checagem e a gravação acontecem juntas, então uma passagem para HUMAN que
 * aconteça enquanto a IA ainda gerava a resposta vence e a resposta é recusada.
 * Mensagens de HUMAN/SYSTEM são fatos que já aconteceram e sempre são gravadas.
 */
export async function recordOutboundMessage(
  store: ConversationsStore,
  rawInput: OutboundMessageInput,
  now: Date = new Date(),
): Promise<OutboundMessageResult> {
  const input = parseOrThrow(outboundSchema, rawInput);
  if (input.sender === "HUMAN" && !input.senderRef) {
    throw new InvalidInputError("Informe quem é o atendente da mensagem.");
  }

  const find = (repo: Parameters<Parameters<ConversationsStore["transaction"]>[0]>[0]) =>
    repo.findConversationById(input.conversationId);

  const lookupDuplicate = async (): Promise<MessageRecord | null> => {
    if (!input.externalMessageId) return null;
    const externalId = input.externalMessageId;
    return store.transaction(async (repo) => {
      const conversation = await find(repo);
      if (!conversation) throw new ConversationNotFoundError();
      return repo.findMessageByExternalId(conversation.unitId, conversation.channel, externalId);
    });
  };

  const already = await lookupDuplicate();
  if (already) return { duplicate: true, messageId: already.id };

  try {
    return await store.transaction(async (repo) => {
      const conversation = await find(repo);
      if (!conversation) throw new ConversationNotFoundError();

      if (input.sender === "AI") {
        const allowed = await repo.touchIfMode(conversation.id, "BOT", now);
        if (!allowed) throw new AiResponseBlockedError();
      } else {
        await repo.touchConversation(conversation.id, now);
      }

      const message = await repo.createMessage({
        conversationId: conversation.id,
        direction: "OUTBOUND",
        sender: input.sender,
        senderRef: input.senderRef ?? null,
        content: input.content,
        externalId: input.externalMessageId ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
      });
      return { duplicate: false, messageId: message.id };
    });
  } catch (error) {
    if (error instanceof UniqueConflictError) {
      const winner = await lookupDuplicate();
      if (winner) return { duplicate: true, messageId: winner.id };
    }
    throw error;
  }
}
