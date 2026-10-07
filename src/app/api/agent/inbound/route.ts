import path from "node:path";
import { after } from "next/server";
import { createShadowDeps } from "@/lib/agent-db";
import {
  countRecentInboundForContact,
  lastInboundForContact,
  mediaMessageExists,
  openingStateForConversation,
  prismaGroupingReader,
  resolveInboundUnitId,
} from "@/lib/agent-db/inbound";
import { createInboundHandler, inboundConfigFromEnv } from "@/lib/agent-http/inbound";
import { FixedWindowLimiter } from "@/lib/agent-http/security";
import { createTranscriber, transcriberConfigFromEnv } from "@/lib/agent-media/transcribe";
import { createClaudeModelFromEnv } from "@/lib/agent-model/claude";
import { loadReferenceImages, type ReferenceImage } from "@/lib/agent-model/references";
import { processAfterQuietPeriod } from "@/lib/agent/pipeline";
import { prismaConversationsStore } from "@/lib/conversations/prismaRepo";

// Entrada do agente em MODO SOMBRA. Desligada por padrão: só responde com
// AGENT_INBOUND_ENABLED=true e AGENT_INBOUND_SECRET (32+ caracteres) definidos.
// Nunca responde ao cliente: registra a mensagem e roda o agente depois da
// resposta HTTP, gravando apenas um AgentRun (rascunho).

export const dynamic = "force-dynamic";
// Espera de agrupamento (até 15 s) + chamada ao modelo (até 30 s).
export const maxDuration = 60;

// Incluído no pacote da função por `outputFileTracingIncludes` (next.config.mjs).
const PROMPT_PATH = path.join(process.cwd(), "agente", "00-prompt-do-agente-v2.md");
// Camada comercial: vem depois do V2 e nunca vence as regras dele. AGENT_COMMERCIAL_LAYER=off desliga.
const COMMERCIAL_LAYER_PATH = path.join(process.cwd(), "agente", "08-camada-comercial.md");

/** Agrupamento da resposta de teste: 1,2 s de silêncio; responde de qualquer jeito após 4 s (o ManyChat espera só 10 s). */
const TEST_REPLY_GROUPING = { quietMs: 1200, maxWaitMs: 4000 };

// Fotos do portfólio usadas como referência visual (também em `outputFileTracingIncludes`).
const REFERENCES_DIR = path.join(process.cwd(), "agente", "referencias");
let referenceImages: ReferenceImage[] | null = null;

// Por instância: primeira barreira contra excesso de requisições.
let ipLimiter: FixedWindowLimiter | null = null;

export async function POST(request: Request): Promise<Response> {
  const config = inboundConfigFromEnv();
  ipLimiter ??= new FixedWindowLimiter(config.ipLimitPerMinute, 60_000);
  // Sem ANTHROPIC_API_KEY o modelo fica indisponível: as mensagens são só registradas.
  referenceImages ??= loadReferenceImages(REFERENCES_DIR);
  const model = config.enabled ? createClaudeModelFromEnv(process.env, { referenceImages }) : null;
  const promptPath = process.env.AGENT_COMMERCIAL_LAYER === "off" ? [PROMPT_PATH] : [PROMPT_PATH, COMMERCIAL_LAYER_PATH];
  const deps = model ? createShadowDeps({ model, promptPath }) : null;

  const handler = createInboundHandler({
    config,
    conversations: prismaConversationsStore,
    resolveUnitId: () => resolveInboundUnitId(config.unitSlug),
    countRecentForContact: countRecentInboundForContact,
    lastInboundForContact,
    // Áudio: baixa o arquivo do ManyChat e transcreve (desligado sem OPENAI_API_KEY e AGENT_TRANSCRIBE_ENABLED=true).
    transcribeMedia: createTranscriber(transcriberConfigFromEnv()),
    mediaMessageExists,
    // Abertura do cliente novo (só fotos/mídia/link) e silêncio enquanto o nome não chega: sem o modelo.
    openingState: openingStateForConversation,
    processJob: deps
      ? (job) => processAfterQuietPeriod({ agent: deps.live, grouping: prismaGroupingReader }, job, { policy: config.grouping })
      : null,
    // Só para contatos de teste (AGENT_TEST_REPLY_CONTACT_IDS): espera curta para juntar
    // mensagens enviadas juntas (ex.: duas fotos); a mais nova responde por todas e as
    // outras devolvem "sem texto". Curta para caber no tempo da Solicitação externa do ManyChat.
    processJobInline: deps
      ? (job) =>
          processAfterQuietPeriod({ agent: deps.live, grouping: prismaGroupingReader }, job, {
            policy: TEST_REPLY_GROUPING,
          })
      : null,
    schedule: (task) => after(task),
    now: () => new Date(),
    // Logs sem conteúdo de mensagem, telefone ou nome.
    log: (event, data) => console.info(JSON.stringify({ event, ...data })),
    ipLimiter,
  });

  return handler(request);
}
