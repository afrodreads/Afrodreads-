import { prismaConversationsStore } from "../conversations/prismaRepo";
import type { ModelClient } from "../agent/model";
import type { LiveDeps, ReplayDeps } from "../agent/orchestrator";
import { fileSystemPromptSource } from "../agent/promptSourceFs";
import type { ProcessDeps } from "../agent/systemEvents";
import { ShadowSystemDispatcher } from "../agent/systemEvents";
import { prismaSystemEventStore } from "./events";
import {
  prismaAgentContextReader,
  prismaPromotionsProvider,
  prismaSecureUnitSettings,
  prismaSystemEventReader,
  prismaUnitConfigProvider,
} from "./reader";
import { prismaAgentRunStore, prismaPromptRegistry } from "./runs";

// Monta as dependências de PRODUÇÃO do agente em modo sombra. O modelo é
// sempre passado pelo chamador (não existe cliente de IA real nesta fase), e o
// caminho do prompt também (nada fixo aqui).

export function createShadowDeps(options: { model: ModelClient; promptPath: string | readonly string[] }) {
  const reader = prismaAgentContextReader({ units: prismaUnitConfigProvider, promotions: prismaPromotionsProvider });
  const core = {
    config: { mode: "shadow" as const },
    reader,
    model: options.model,
    prompt: fileSystemPromptSource(options.promptPath),
    prompts: prismaPromptRegistry,
    runs: prismaAgentRunStore,
  };
  const live: LiveDeps = { ...core, store: prismaConversationsStore };
  const replay: ReplayDeps = { ...core, messages: reader };
  const system: ProcessDeps = {
    config: { mode: "shadow" },
    events: prismaSystemEventStore,
    reader: prismaSystemEventReader({ units: prismaUnitConfigProvider }),
    secure: prismaSecureUnitSettings,
    dispatcher: new ShadowSystemDispatcher(),
  };
  return { live, replay, system, conversations: prismaConversationsStore };
}
