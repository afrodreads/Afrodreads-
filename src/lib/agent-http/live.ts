// Modo "piloto": o agente responde a leads reais (não só aos contatos de teste), mas só
// dentro de uma janela de horário (por padrão 21h30 às 9h30 e aos domingos, quando a equipe
// está offline) e com limites de segurança. Tudo aqui é função pura (testável sem rede).
//
// Quem escolhe entre o agente e o robô antigo é a automação do ManyChat, perguntando a
// este servidor (`type: "gate"`). O servidor nunca envia nada ao WhatsApp.

import type { ConversationMode } from "../conversations/types";

export type LiveConfig = {
  /** off: só contatos de teste. night: janela de horário (padrão 21h30–9h30 + domingos). */
  mode: "off" | "night";
  /** Minuto do dia (0–1439) em que a janela abre e fecha (horário de São Paulo). */
  startMinute: number;
  endMinute: number;
  /** Domingos o dia inteiro (a equipe não atende no domingo). */
  sundays: boolean;
  /** Feriados "AAAA-MM-DD" com o dia inteiro aberto. */
  holidays: ReadonlySet<string>;
  /** Teto de respostas do agente por contato por dia (trava contra laço). */
  maxRepliesPerContactPerDay: number;
  /** Teto de respostas do agente por dia, somando todos os contatos (trava de custo). */
  maxRepliesPerDay: number;
};

export const DEFAULT_LIVE_CONFIG: LiveConfig = Object.freeze({
  mode: "off",
  startMinute: 21 * 60 + 30,
  endMinute: 9 * 60 + 30,
  sundays: true,
  holidays: new Set<string>(),
  maxRepliesPerContactPerDay: 40,
  maxRepliesPerDay: 400,
});

function parseHm(value: string | undefined, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return fallback;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? minutes : fallback;
}

export function liveConfigFromEnv(env: Record<string, string | undefined> = process.env): LiveConfig {
  const int = (value: string | undefined, fallback: number, max: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.min(Math.round(parsed), max) : fallback;
  };
  const [from, to] = (env.AGENT_LIVE_WINDOW ?? "").split("-");
  return {
    // Qualquer valor diferente de "night" deixa desligado: erro de digitação nunca liga o piloto.
    mode: env.AGENT_LIVE_MODE?.trim() === "night" ? "night" : "off",
    startMinute: parseHm(from, DEFAULT_LIVE_CONFIG.startMinute),
    endMinute: parseHm(to, DEFAULT_LIVE_CONFIG.endMinute),
    sundays: env.AGENT_LIVE_SUNDAYS !== "off",
    holidays: new Set(
      (env.AGENT_LIVE_HOLIDAYS ?? "")
        .split(",")
        .map((day) => day.trim())
        .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)),
    ),
    maxRepliesPerContactPerDay: int(env.AGENT_LIVE_MAX_PER_CONTACT_DAY, DEFAULT_LIVE_CONFIG.maxRepliesPerContactPerDay, 500),
    maxRepliesPerDay: int(env.AGENT_LIVE_MAX_PER_DAY, DEFAULT_LIVE_CONFIG.maxRepliesPerDay, 5000),
  };
}

// São Paulo não tem horário de verão desde 2019: UTC-3 fixo.
const SAO_PAULO_OFFSET_MS = -3 * 60 * 60 * 1000;

function saoPauloParts(now: Date): { day: string; minute: number; weekday: number } {
  const local = new Date(now.getTime() + SAO_PAULO_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    day: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
    weekday: local.getUTCDay(), // 0 = domingo
  };
}

/** Meia-noite de hoje em São Paulo (para contar as respostas do dia). */
export function startOfSaoPauloDay(now: Date): Date {
  const local = new Date(now.getTime() + SAO_PAULO_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - SAO_PAULO_OFFSET_MS);
}

/** A janela do piloto está aberta agora? (A janela cruza a meia-noite: 21h30 → 9h30.) */
export function isLiveWindowOpen(live: LiveConfig, now: Date): boolean {
  if (live.mode !== "night") return false;
  const { day, minute, weekday } = saoPauloParts(now);
  if (live.holidays.has(day) || (live.sundays && weekday === 0)) return true;
  if (live.startMinute === live.endMinute) return false;
  return live.startMinute > live.endMinute
    ? minute >= live.startMinute || minute < live.endMinute
    : minute >= live.startMinute && minute < live.endMinute;
}

export type LiveReason = "test" | "off" | "daily_cap" | "contact_cap" | "active_conversation" | "window" | "closed";

export type LiveDecision = {
  /** O agente cuida deste contato agora (senão, o robô antigo segue). */
  agente: boolean;
  /** O agente cuida, mas não responde (limite diário do contato). */
  silent: boolean;
  reason: LiveReason;
};

/**
 * Decide quem atende. Ordem: contato de teste; piloto desligado; limite diário geral
 * (devolve o lead ao robô antigo); conversa que o agente já tem em andamento (continua,
 * mesmo depois da janela); janela de horário aberta; senão, robô antigo.
 */
export function decideLive(
  live: LiveConfig,
  now: Date,
  input: { isTest: boolean; conversationMode: ConversationMode | null; repliesToday: number; contactRepliesToday: number },
): LiveDecision {
  if (input.isTest) return { agente: true, silent: false, reason: "test" };
  if (live.mode === "off") return { agente: false, silent: false, reason: "off" };
  if (input.repliesToday >= live.maxRepliesPerDay) return { agente: false, silent: false, reason: "daily_cap" };

  const active = input.conversationMode === "BOT" || input.conversationMode === "HUMAN";
  if (!active && !isLiveWindowOpen(live, now)) return { agente: false, silent: false, reason: "closed" };

  if (input.contactRepliesToday >= live.maxRepliesPerContactPerDay) return { agente: true, silent: true, reason: "contact_cap" };
  return { agente: true, silent: false, reason: active ? "active_conversation" : "window" };
}
