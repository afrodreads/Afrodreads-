import { createHash } from "node:crypto";
import { z } from "zod";
import { DomainError } from "../conversations/errors";
import { recordOutboundMessage } from "../conversations/message";
import { normalizePhone } from "../conversations/phone";
import type { ConversationsStore } from "../conversations/repo";
import { normalizeGroupingPolicy, type GroupingPolicy } from "../agent/grouping";
import { ingestInbound } from "../agent/pipeline";
import { clientIp, FixedWindowLimiter, secretFromHeaders, secretsMatch } from "./security";

// Entrada autenticada do agente (POST /api/agent/inbound), em MODO SOMBRA.
//
// Recebe a mensagem do canal (ManyChat/WhatsApp), registra e agenda a execução
// do agente para DEPOIS da resposta HTTP. A resposta nunca contém texto da IA:
// esta rota não responde ao cliente, só confirma o recebimento.
//
// Também aceita `type: "human_reply"`: o registro de uma mensagem que a equipe
// JÁ enviou pelo WhatsApp (fato), usado para comparar IA × equipe. Isso não
// envia nada.

export type InboundConfig = {
  /** Interruptor geral. Desligado: a rota responde 404 como se não existisse. */
  enabled: boolean;
  /** Segredo compartilhado (mínimo 32 caracteres). */
  secret: string | null;
  /** Unidade desta entrada (slug). Nulo: a única unidade ativa. */
  unitSlug: string | null;
  /** Janela aceita para o horário da mensagem (proteção contra reenvio de payload antigo). */
  maxAgeMs: number;
  maxFutureMs: number;
  /** Máximo de mensagens por contato por minuto (conferido no banco). */
  contactLimitPerMinute: number;
  /** Máximo de requisições por IP por minuto (por instância). */
  ipLimitPerMinute: number;
  grouping: GroupingPolicy;
};

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_TEXT_CHARS = 4000;
const MIN_SECRET_LENGTH = 32;

export function inboundConfigFromEnv(env: Record<string, string | undefined> = process.env): InboundConfig {
  const secret = env.AGENT_INBOUND_SECRET?.trim() ?? "";
  const int = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    enabled: env.AGENT_INBOUND_ENABLED === "true",
    secret: secret.length >= MIN_SECRET_LENGTH ? secret : null,
    unitSlug: env.AGENT_INBOUND_UNIT_SLUG?.trim() || null,
    maxAgeMs: 10 * 60 * 1000,
    maxFutureMs: 2 * 60 * 1000,
    contactLimitPerMinute: Math.min(int(env.AGENT_CONTACT_LIMIT_PER_MINUTE, 20), 120),
    ipLimitPerMinute: Math.min(int(env.AGENT_IP_LIMIT_PER_MINUTE, 300), 3000),
    grouping: normalizeGroupingPolicy({
      quietMs: int(env.AGENT_GROUPING_QUIET_MS, 4000),
      maxWaitMs: int(env.AGENT_GROUPING_MAX_WAIT_MS, 20000),
    }),
  };
}

/** Formato que o ManyChat (External Request) envia. Ver docs/agent-phase4a.md. */
export const inboundPayloadSchema = z
  .object({
    channel: z.literal("whatsapp"),
    type: z.enum(["message", "human_reply"]).default("message"),
    /** Opcional: o ManyChat não oferece um id único por mensagem. Sem ele, o id é derivado (ver `derivedMessageId`). */
    messageId: z.string().trim().min(1).max(200).optional(),
    contactId: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(8).max(40),
    name: z.string().trim().max(120).nullish(),
    text: z.string().max(MAX_TEXT_CHARS * 2),
    /** Opcional: sem ele, vale o horário em que o servidor recebeu a mensagem. */
    timestamp: z.union([z.string().trim().min(1).max(40), z.number().finite()]).optional(),
    /** Atendente (só em human_reply). */
    agent: z.string().trim().min(1).max(80).nullish(),
  })
  .strict();

export type InboundPayload = z.infer<typeof inboundPayloadSchema>;

export function parseTimestamp(value: string | number): Date | null {
  if (typeof value === "number" || /^\d+$/.test(value)) {
    const n = Number(value);
    const ms = n < 1e12 ? n * 1000 : n; // segundos ou milissegundos
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Id estável para quando o canal não manda um id único por mensagem: o mesmo
 * contato enviando o mesmo texto no mesmo minuto vira a mesma mensagem (cobre
 * reenvios do ManyChat). Proteção mais fraca que um id real; aceitável em modo sombra.
 */
export function derivedMessageId(contactId: string, text: string, now: Date): string {
  const minute = Math.floor(now.getTime() / 60_000);
  const digest = createHash("sha256").update(`${contactId}\n${text}\n${minute}`).digest("hex");
  return `derived:${digest.slice(0, 40)}`;
}

export type ProcessJob = { conversationId: string; triggerMessageId: string };

export type InboundHandlerDeps = {
  config: InboundConfig;
  conversations: ConversationsStore;
  /** Unidade desta entrada (pela configuração, nunca pelo payload). */
  resolveUnitId(): Promise<string | null>;
  /** Mensagens recebidas deste contato (nesta unidade) desde `since`. */
  countRecentForContact(unitId: string, contactId: string, since: Date): Promise<number>;
  /** Execução do agente em sombra para depois da resposta. null = modelo indisponível (só registra). */
  processJob: ((job: ProcessJob) => Promise<unknown>) | null;
  /** Agenda trabalho para depois da resposta (na rota: `after` do Next). */
  schedule(task: () => Promise<void>): void;
  now(): Date;
  log(event: string, data: Record<string, string | number | boolean | null>): void;
  ipLimiter?: FixedWindowLimiter;
};

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function reply(status: number, body: Record<string, string | boolean>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const fail = (status: number, error: string) => reply(status, { ok: false, error });

export function createInboundHandler(deps: InboundHandlerDeps): (request: Request) => Promise<Response> {
  const ipLimiter = deps.ipLimiter ?? new FixedWindowLimiter(deps.config.ipLimitPerMinute, 60_000);

  return async (request: Request) => {
    const { config } = deps;
    // Desligada ou sem segredo configurado: comporta-se como rota inexistente.
    if (!config.enabled || !config.secret) return fail(404, "not_found");

    if (!secretsMatch(secretFromHeaders(request.headers), config.secret)) {
      deps.log("agent_inbound_unauthorized", { ip: clientIp(request.headers) });
      return fail(401, "unauthorized");
    }
    if (!ipLimiter.take(clientIp(request.headers))) return fail(429, "rate_limited");

    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return fail(413, "payload_too_large");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return fail(400, "invalid_payload");
    }
    const parsed = inboundPayloadSchema.safeParse(json);
    if (!parsed.success) return fail(400, "invalid_payload");
    const payload = parsed.data;

    const text = payload.text.trim();
    if (!text || text.length > MAX_TEXT_CHARS) return fail(400, "invalid_payload");
    // O telefone serve para achar/criar o cliente; a conversa é identificada pelo contactId do canal.
    if (!normalizePhone(payload.phone)) return fail(400, "invalid_payload");

    const now = deps.now();
    const sentAt = payload.timestamp === undefined ? now : parseTimestamp(payload.timestamp);
    if (!sentAt) return fail(400, "invalid_payload");
    const messageId = payload.messageId ?? derivedMessageId(payload.contactId, text, now);
    // Proteção contra reenvio de payload antigo (replay) e relógio adiantado.
    if (now.getTime() - sentAt.getTime() > config.maxAgeMs || sentAt.getTime() - now.getTime() > config.maxFutureMs) {
      return fail(400, "stale_message");
    }

    try {
      const unitId = await deps.resolveUnitId();
      if (!unitId) return fail(503, "unavailable");

      const recent = await deps.countRecentForContact(unitId, payload.contactId, new Date(now.getTime() - 60_000));
      if (recent >= config.contactLimitPerMinute) return fail(429, "rate_limited");

      if (payload.type === "human_reply") {
        const conversation = await deps.conversations.transaction((repo) =>
          repo.findConversationByExternalId(unitId, "WHATSAPP", payload.contactId),
        );
        if (!conversation) return reply(202, { ok: true, status: "ignored" });
        // Fato: a equipe JÁ respondeu pelo WhatsApp. Só registra (para comparar com a IA).
        const recorded = await recordOutboundMessage(
          deps.conversations,
          {
            conversationId: conversation.id,
            sender: "HUMAN",
            senderRef: payload.agent ?? "equipe",
            externalMessageId: messageId,
            content: text,
          },
          sentAt,
        );
        return reply(recorded.duplicate ? 200 : 202, { ok: true, status: recorded.duplicate ? "duplicate" : "recorded" });
      }

      const { inbound, shouldProcess } = await ingestInbound(
        deps.conversations,
        {
          unitId,
          phone: payload.phone,
          customerName: payload.name ?? null,
          externalConversationId: payload.contactId,
          externalMessageId: messageId,
          content: text,
          sentAt,
        },
        now,
      );

      if (inbound.duplicate) return reply(200, { ok: true, status: "duplicate" });

      if (shouldProcess && deps.processJob) {
        const processJob = deps.processJob;
        const job = { conversationId: inbound.conversationId, triggerMessageId: inbound.messageId };
        deps.schedule(async () => {
          try {
            await processJob(job);
          } catch (error) {
            deps.log("agent_shadow_failed", { conversationId: job.conversationId, error: error instanceof Error ? error.name : "Error" });
          }
        });
      }
      return reply(202, { ok: true, status: "accepted" });
    } catch (error) {
      if (error instanceof DomainError) return fail(400, "invalid_payload");
      deps.log("agent_inbound_error", { error: error instanceof Error ? error.name : "Error" });
      return fail(500, "internal_error");
    }
  };
}
