import { createHash } from "node:crypto";
import { z } from "zod";
import { DomainError } from "../conversations/errors";
import { recordOutboundMessage } from "../conversations/message";
import { normalizePhone } from "../conversations/phone";
import type { ConversationsStore } from "../conversations/repo";
import { normalizeGroupingPolicy, type GroupingPolicy } from "../agent/grouping";
import { ingestInbound } from "../agent/pipeline";
import { isAllowedMediaUrl, type MediaResult } from "../agent-media/transcribe";
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
  /**
   * Contatos de TESTE (ids do canal, da configuração, nunca do payload) para os quais a
   * resposta HTTP devolve o texto do rascunho. Quem envia é o ManyChat; este servidor
   * continua sem enviar nada. Vazio/ausente: ninguém recebe texto (modo sombra puro).
   */
  testReplyContactIds?: ReadonlySet<string>;
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
    // No máximo 5 contatos de teste, para a lista nunca virar "todo mundo" por engano.
    testReplyContactIds: new Set(
      (env.AGENT_TEST_REPLY_CONTACT_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 5),
    ),
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
    /** Link do arquivo da última mídia do contato (campo do ManyChat). Vazio = sem mídia. */
    mediaUrl: z.string().trim().max(2000).nullish().transform((value) => value || null),
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
  /** Baixa e transcreve uma mídia (adaptador `agent-media`). Ausente = mídia vira aviso. */
  transcribeMedia?(url: string): Promise<MediaResult>;
  /** Se esta mídia (id `media:...`) já foi registrada para o contato. */
  mediaMessageExists?(unitId: string, contactId: string, externalMessageId: string): Promise<boolean>;
  /** Última mensagem recebida do contato e se já houve resposta depois dela (detecta mídia). */
  lastInboundForContact?(unitId: string, contactId: string): Promise<{ text: string; answered: boolean } | null>;
  /** Situação da abertura da conversa (só contatos de teste): permite responder sem o modelo. */
  openingState?(conversationId: string): Promise<OpeningState>;
  /** Execução do agente em sombra para depois da resposta. null = modelo indisponível (só registra). */
  processJob: ((job: ProcessJob) => Promise<unknown>) | null;
  /** Execução imediata (sem espera de agrupamento), só para contatos de teste. */
  processJobInline?: ((job: ProcessJob) => Promise<unknown>) | null;
  /** Agenda trabalho para depois da resposta (na rota: `after` do Next). */
  schedule(task: () => Promise<void>): void;
  now(): Date;
  log(event: string, data: Record<string, string | number | boolean | null>): void;
  ipLimiter?: FixedWindowLimiter;
};

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

/** Valor de `reply` quando não há texto a enviar. Não é texto da IA; o fluxo do ManyChat deve ignorá-lo. */
export const NO_REPLY = "-";

function reply(status: number, body: Record<string, string | boolean>): Response {
  // Toda resposta de sucesso traz `reply`, nunca vazio: o mapeamento do ManyChat falha
  // ("Json mapping errors") quando o campo não existe e, ao que tudo indica, quando vem vazio.
  const payload = body.ok === true ? { reply: NO_REPLY, reply2: NO_REPLY, ...body } : body;
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

const fail = (status: number, error: string) => reply(status, { ok: false, error });

/**
 * Texto gravado no lugar de uma mídia (foto, vídeo, áudio, figurinha, arquivo). O ManyChat só
 * entrega o último TEXTO do contato: quando o cliente manda mídia, chega um link do arquivo ou
 * o mesmo texto anterior repetido. Sem isto o agente responderia de novo ao texto antigo.
 */
export const MEDIA_PLACEHOLDER =
  "[O cliente enviou uma mídia (foto, vídeo, áudio ou arquivo) sem texto. Ela chegou para a equipe; você não consegue ver nem ouvir o conteúdo.]";

/** Foto: o texto gravado; a imagem vai anexada ao modelo pelo link em metadata.imageUrl. */
export const IMAGE_PLACEHOLDER = "[O cliente enviou uma foto. Ela está anexada a esta mensagem.]";
/** Tamanho máximo de texto aceito em metadata (ver conversations/message.ts). */
const MAX_METADATA_TEXT = 200;

/** Áudio transcrito: o agente lê como mensagem do cliente (a transcrição pode ter pequenos erros). */
export const AUDIO_PREFIX = "[Áudio do cliente, transcrito automaticamente]: ";

const BARE_URL = /^https?:\/\/\S+$/i;
/** Variável do ManyChat que não foi substituída (ex.: "{{last_input_text}}"). */
const UNFILLED_VARIABLE = /^\{\{[^{}]*\}\}$/;

/** Id estável da mídia: o mesmo arquivo nunca é transcrito nem respondido duas vezes. */
export function mediaMessageId(contactId: string, url: string): string {
  return `media:${createHash("sha256").update(`${contactId}\n${url}`).digest("hex").slice(0, 40)}`;
}

type CustomerContent = { content: string; messageId: string | null; metadata?: Record<string, string> };

async function customerContent(
  deps: InboundHandlerDeps,
  unitId: string,
  contactId: string,
  text: string,
  mediaUrl: string | null,
): Promise<CustomerContent> {
  // Link de mídia: no campo próprio ou no lugar do texto. Um link que já foi tratado é o
  // campo "último arquivo" que ficou preenchido no ManyChat: aí vale o texto.
  // Só link de ARQUIVO do canal vira mídia; link de Instagram/TikTok/YouTube etc. é texto do cliente.
  const url = mediaUrl ?? (BARE_URL.test(text) && isAllowedMediaUrl(text) ? text : null);
  if (url) {
    const id = mediaMessageId(contactId, url);
    const seen = deps.mediaMessageExists ? await deps.mediaMessageExists(unitId, contactId, id) : false;
    if (!seen) {
      const media = deps.transcribeMedia ? await deps.transcribeMedia(url) : null;
      deps.log("agent_inbound_media", {
        kind: media?.kind ?? "unsupported",
        reason: media?.kind === "failed" ? media.reason : null,
        contentType: media?.kind === "other" ? (media.contentType ?? null) : null,
      });
      if (media?.kind === "audio") return { content: AUDIO_PREFIX + media.text.slice(0, MAX_TEXT_CHARS), messageId: id };
      // Foto com link curto o bastante para guardar: o modelo vê a imagem. Senão, só o aviso.
      if (media?.kind === "image" && url.length <= MAX_METADATA_TEXT) {
        return { content: IMAGE_PLACEHOLDER, messageId: id, metadata: { media: "image", imageUrl: url } };
      }
      return { content: MEDIA_PLACEHOLDER, messageId: id };
    }
    // Mesma mídia de novo e nenhum texto novo: é reenvio; o id repetido faz virar duplicata.
    if (url === text || !text) return { content: MEDIA_PLACEHOLDER, messageId: id };
  }
  // Sem texto e sem link: o ManyChat não tinha texto novo para mandar, então foi uma mídia.
  // Id próprio (por minuto): não colide com o texto anterior e absorve reenvios do ManyChat.
  if (!text) {
    deps.log("agent_inbound_media", { kind: "no_text", reason: null });
    return { content: MEDIA_PLACEHOLDER, messageId: derivedMessageId(contactId, "\u0000midia", deps.now()) };
  }
  const last = deps.lastInboundForContact ? await deps.lastInboundForContact(unitId, contactId) : null;
  // Mesmo texto do cliente de novo, depois de já termos respondido: foi uma mídia sem link.
  // Id próprio: com o id do texto, uma mídia no mesmo minuto do texto virava "duplicata".
  if (last && last.answered && last.text.trim() === text) {
    deps.log("agent_inbound_media", { kind: "repeated_text", reason: null });
    return { content: MEDIA_PLACEHOLDER, messageId: derivedMessageId(contactId, `\u0000midia\n${text}`, deps.now()) };
  }
  return { content: text, messageId: null };
}

/** O agente escreve isto (sozinho) quando o certo é não responder nada agora. */
export const SILENCE_TOKEN = "[[SILENCIO]]";
/** Separa a resposta em duas mensagens do WhatsApp (no máximo duas). */
export const SPLIT_TOKEN = "[[NOVA_MENSAGEM]]";

/** Texto do rascunho SÓ se o agente terminou com DRAFT_SAVED (passou nas travas). */
function approvedDraftText(result: unknown): string | null {
  const run = (result as { result?: { outcome?: unknown; candidateText?: unknown } | null } | null)?.result;
  if (run?.outcome !== "DRAFT_SAVED" || typeof run.candidateText !== "string") return null;
  const text = run.candidateText.split(SILENCE_TOKEN).join("").trim();
  return text ? text : null;
}

/** Partes da resposta (1 ou 2), sem o marcador e sem partes vazias. */
export function messageParts(text: string): string[] {
  const parts = text
    .split(SPLIT_TOKEN)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length <= 2 ? parts : [parts[0], parts.slice(1).join("\n\n")];
}

export type OpeningState = {
  /** Já houve alguma mensagem enviada nesta conversa (IA ou equipe). */
  anyOutbound: boolean;
  /** Texto da última mensagem enviada, se foi da IA. */
  lastAiText: string | null;
  /** O que o cliente mandou depois da última mensagem enviada (em ordem). */
  pending: string[];
};

/** Roteiro fixo do cliente novo que abre a conversa só com fotos, mídia ou link (prompt, Estado A). */
export const WELCOME_TEXT = "Oi! Que bom ter você aqui 💛 Sou a atendente virtual da Afro Dreads, vem ficar no estilo com a gente!";
export const NAME_QUESTION = "Pra iniciar seu atendimento, me fala como você se chama?";

const isMediaOnly = (content: string) =>
  content === IMAGE_PLACEHOLDER || content === MEDIA_PLACEHOLDER || BARE_URL.test(content.trim());

/**
 * Abertura sem o modelo (instantânea, sem risco de passar do tempo do ManyChat):
 * - primeira mensagem do cliente novo é só foto/mídia/link → boas-vindas + pergunta do nome;
 * - a última mensagem foi a pergunta do nome e chegou só mais foto/mídia/link → silêncio.
 * Texto ou áudio (pode trazer o nome) seguem para o modelo.
 */
export function openingReply(state: OpeningState): { parts: string[] } | null {
  if (state.pending.length === 0 || !state.pending.every(isMediaOnly)) return null;
  if (!state.anyOutbound) {
    const images = state.pending.every((content) => content === IMAGE_PLACEHOLDER);
    const links = state.pending.every((content) => BARE_URL.test(content.trim()));
    const received = images ? "Já recebi suas fotos." : links ? "Já recebi o link." : "Já recebi o que você me mandou.";
    return { parts: [`${WELCOME_TEXT} ${received}`, NAME_QUESTION] };
  }
  if (state.lastAiText?.trim().endsWith(NAME_QUESTION)) return { parts: [] };
  return null;
}

/**
 * O ManyChat espera a resposta por no máximo 10 s; depois disso ela se perde. Resposta que
 * fica pronta tarde não é gravada (o cliente não a viu) e volta "sem texto": a próxima
 * mensagem do cliente é respondida por inteiro.
 */
export const TEST_REPLY_DEADLINE_MS = 9_000;

/**
 * Contato de teste: executa o agente e devolve o texto aprovado na resposta HTTP. O texto
 * também é gravado como mensagem da IA, para a conversa não parecer sem resposta nas
 * próximas rodadas. Este servidor NÃO envia nada ao WhatsApp: quem envia é o ManyChat.
 */
async function replyForTestContact(
  deps: InboundHandlerDeps,
  run: (job: ProcessJob) => Promise<unknown>,
  job: ProcessJob,
  startedAt: number,
): Promise<Response> {
  let text: string | null = null;
  let opening: { parts: string[] } | null = null;
  try {
    opening = deps.openingState ? openingReply(await deps.openingState(job.conversationId)) : null;
  } catch (error) {
    deps.log("agent_test_opening_failed", { error: error instanceof Error ? error.name : "Error" });
  }
  if (opening) {
    deps.log("agent_test_reply_opening", { parts: opening.parts.length });
    text = opening.parts.length > 0 ? opening.parts.join(`\n${SPLIT_TOKEN}\n`) : null;
  } else {
    try {
      text = approvedDraftText(await run(job));
    } catch (error) {
      deps.log("agent_test_reply_failed", { error: error instanceof Error ? error.name : "Error" });
    }
    const elapsedMs = deps.now().getTime() - startedAt;
    if (text && elapsedMs > TEST_REPLY_DEADLINE_MS) {
      deps.log("agent_test_reply_late", { elapsedMs });
      text = null;
    }
  }
  if (text) {
    try {
      await recordOutboundMessage(
        deps.conversations,
        { conversationId: job.conversationId, sender: "AI", senderRef: "teste-manychat", content: messageParts(text).join("\n\n") },
        deps.now(),
      );
    } catch (error) {
      // Conversa passou para a equipe enquanto a IA respondia (ou falha ao gravar): não devolve o texto.
      deps.log("agent_test_reply_discarded", { error: error instanceof Error ? error.name : "Error" });
      text = null;
    }
  }
  const parts = text ? messageParts(text) : [];
  return reply(200, {
    ok: true,
    status: parts.length > 0 ? "replied" : "no_reply",
    reply: parts[0] ?? NO_REPLY,
    reply2: parts[1] ?? NO_REPLY,
  });
}

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
    if (!parsed.success) {
      // Só os NOMES dos campos recusados (nunca valores): sem isso um 400 do ManyChat não tem pista.
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "(corpo)"))].join(",");
      deps.log("agent_inbound_invalid_payload", { fields });
      return fail(400, "invalid_payload");
    }
    const payload = parsed.data;

    const mediaUrl =
      payload.type === "message" && payload.mediaUrl && !UNFILLED_VARIABLE.test(payload.mediaUrl) ? payload.mediaUrl : null;
    // Variável do ManyChat que não foi substituída (ex.: contato sem texto recente): não é texto de cliente.
    const text = UNFILLED_VARIABLE.test(payload.text.trim()) ? "" : payload.text.trim();
    if (text.length > MAX_TEXT_CHARS) return fail(400, "invalid_payload");
    // Sem texto: só vale como mídia de cliente (nunca como resposta da equipe).
    if (!text && payload.type !== "message") return fail(400, "invalid_payload");
    // O telefone serve para achar/criar o cliente; a conversa é identificada pelo contactId do canal.
    if (!normalizePhone(payload.phone)) {
      deps.log("agent_inbound_invalid_payload", { fields: "phone(formato)" });
      return fail(400, "invalid_payload");
    }

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
      if (!unitId) {
        deps.log("agent_inbound_unit_unavailable", {});
        return fail(503, "unavailable");
      }

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

      const { content, messageId: mediaId, metadata } = await customerContent(deps, unitId, payload.contactId, text, mediaUrl);

      const { inbound, shouldProcess } = await ingestInbound(
        deps.conversations,
        {
          unitId,
          phone: payload.phone,
          customerName: payload.name ?? null,
          externalConversationId: payload.contactId,
          externalMessageId: mediaId ?? messageId,
          content,
          ...(metadata ? { metadata } : {}),
          sentAt,
        },
        now,
      );

      if (inbound.duplicate) return reply(200, { ok: true, status: "duplicate" });

      // Contato de TESTE: roda o agente agora e devolve o rascunho (se passou nas travas)
      // para o ManyChat enviar. Qualquer outro contato segue o caminho de sombra abaixo.
      if (shouldProcess && deps.processJobInline && config.testReplyContactIds?.has(payload.contactId)) {
        const job = { conversationId: inbound.conversationId, triggerMessageId: inbound.messageId };
        return await replyForTestContact(deps, deps.processJobInline, job, now.getTime());
      }

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
