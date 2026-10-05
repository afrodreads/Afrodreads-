import path from "node:path";
import { after } from "next/server";
import { createShadowDeps } from "@/lib/agent-db";
import {
  countRecentInboundForContact,
  lastInboundForContact,
  mediaMessageExists,
  prismaGroupingReader,
  resolveInboundUnitId,
} from "@/lib/agent-db/inbound";
import { createInboundHandler, inboundConfigFromEnv } from "@/lib/agent-http/inbound";
import { FixedWindowLimiter } from "@/lib/agent-http/security";
import { createTranscriber, transcriberConfigFromEnv } from "@/lib/agent-media/transcribe";
import { createClaudeModelFromEnv } from "@/lib/agent-model/claude";
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

// Por instância: primeira barreira contra excesso de requisições.
let ipLimiter: FixedWindowLimiter | null = null;

export async function POST(request: Request): Promise<Response> {
  const config = inboundConfigFromEnv();
  ipLimiter ??= new FixedWindowLimiter(config.ipLimitPerMinute, 60_000);
  // Sem ANTHROPIC_API_KEY o modelo fica indisponível: as mensagens são só registradas.
  const model = config.enabled ? createClaudeModelFromEnv() : null;
  const deps = model ? createShadowDeps({ model, promptPath: PROMPT_PATH }) : null;

  const handler = createInboundHandler({
    config,
    conversations: prismaConversationsStore,
    resolveUnitId: () => resolveInboundUnitId(config.unitSlug),
    countRecentForContact: countRecentInboundForContact,
    lastInboundForContact,
    // Áudio: baixa o arquivo do ManyChat e transcreve (desligado sem OPENAI_API_KEY e AGENT_TRANSCRIBE_ENABLED=true).
    transcribeMedia: createTranscriber(transcriberConfigFromEnv()),
    mediaMessageExists,
    processJob: deps
      ? (job) => processAfterQuietPeriod({ agent: deps.live, grouping: prismaGroupingReader }, job, { policy: config.grouping })
      : null,
    // Só para contatos de teste (AGENT_TEST_REPLY_CONTACT_IDS): sem espera de agrupamento.
    processJobInline: deps
      ? (job) =>
          processAfterQuietPeriod({ agent: deps.live, grouping: prismaGroupingReader }, job, {
            policy: { quietMs: 0, maxWaitMs: 0 },
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
