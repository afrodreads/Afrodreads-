import type { Actor, ActorType, ConversationMode } from "./types";

// Regras puras de estado da conversa (sem banco, sem relógio).
//
//   BOT ──► HUMAN ──► FINISHED ──► BOT
//
//  - BOT → HUMAN: a IA (ou uma pessoa, ou o sistema) passa a conversa para a
//    equipe. Sempre acompanhado de um Handoff.
//  - HUMAN → FINISHED: só a equipe (ou o sistema) encerra. A IA não encerra
//    uma conversa que está nas mãos de uma pessoa.
//  - FINISHED → BOT: retomada da IA (ex.: o cliente escreve de novo). Só a
//    equipe ou o sistema reativam; a IA não se reativa sozinha.
//
// Qualquer outra combinação é recusada. Se um dia o negócio precisar de mais
// caminhos (ex.: HUMAN → BOT direto), é aqui que se acrescenta, com teste.

type Rule = { allowedActors: readonly ActorType[]; requiresHandoff: boolean };

const TRANSITIONS: Record<ConversationMode, Partial<Record<ConversationMode, Rule>>> = {
  BOT: {
    HUMAN: { allowedActors: ["AI", "HUMAN", "SYSTEM"], requiresHandoff: true },
  },
  HUMAN: {
    FINISHED: { allowedActors: ["HUMAN", "SYSTEM"], requiresHandoff: false },
  },
  FINISHED: {
    BOT: { allowedActors: ["HUMAN", "SYSTEM"], requiresHandoff: false },
  },
};

export type TransitionVerdict =
  | { ok: true; requiresHandoff: boolean }
  | { ok: false; message: string };

export function evaluateTransition(
  from: ConversationMode,
  to: ConversationMode,
  actor: Actor,
): TransitionVerdict {
  const rule = TRANSITIONS[from]?.[to];
  if (!rule) {
    return { ok: false, message: `Transição não permitida: ${from} → ${to}.` };
  }
  if (!rule.allowedActors.includes(actor.type)) {
    return {
      ok: false,
      message: `${actor.type} não pode fazer a transição ${from} → ${to}.`,
    };
  }
  return { ok: true, requiresHandoff: rule.requiresHandoff };
}

/** Modos de destino possíveis a partir de um modo (útil para telas e testes). */
export function allowedTargets(from: ConversationMode): ConversationMode[] {
  return Object.keys(TRANSITIONS[from] ?? {}) as ConversationMode[];
}

/**
 * A IA só responde em BOT. Em HUMAN a equipe está atendendo; em FINISHED o
 * atendimento acabou e a conversa precisa ser reaberta (FINISHED → BOT) antes
 * de a IA voltar a falar.
 */
export function canAiRespond(mode: ConversationMode): boolean {
  return mode === "BOT";
}
