import type { MessageRecord } from "../conversations/types";
import type { StoredAgentRun } from "./runs";

// Medição do modo sombra: o que a IA TERIA respondido × o que a equipe
// respondeu de verdade, para a mesma mensagem do cliente.
//
// Mede o AGENTE, nunca as pessoas: não existe nota da equipe, ranking nem
// pontuação de clientes. O tempo de resposta humana aparece só como contexto
// para comparar com o tempo da IA.

export type QualityRow = {
  runId: string;
  triggerMessageId: string;
  startedAt: Date;
  aiText: string | null;
  /** Primeira resposta da equipe depois da mensagem e antes da próxima mensagem do cliente. */
  humanReply: { text: string; at: Date } | null;
  humanResponseSeconds: number | null;
  aiDurationMs: number | null;
  handoffProposed: boolean;
  /** A IA tentou dizer algo proibido (bloqueado pelos guardrails ou recusa). */
  forbiddenAttempt: boolean;
  /** A IA não tinha informação suficiente (falha, sem texto ou encaminhou por incerteza). */
  missingInformation: boolean;
  costUsd: number | null;
};

export function pairRunsWithHumanReplies(runs: StoredAgentRun[], messages: MessageRecord[]): QualityRow[] {
  const ordered = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const rows: QualityRow[] = [];

  for (const run of runs) {
    if (run.trigger !== "INBOUND" || !run.outcome) continue;
    const index = ordered.findIndex((message) => message.id === run.triggerMessageId);
    if (index === -1) continue;
    const trigger = ordered[index];

    let humanReply: QualityRow["humanReply"] = null;
    for (const message of ordered.slice(index + 1)) {
      if (message.sender === "CUSTOMER") break;
      if (message.sender === "HUMAN") {
        humanReply = { text: message.content, at: message.createdAt };
        break;
      }
    }

    const handoffReason =
      run.proposedHandoff && typeof run.proposedHandoff === "object" && "reason" in run.proposedHandoff
        ? String(run.proposedHandoff.reason)
        : null;

    rows.push({
      runId: run.id,
      triggerMessageId: run.triggerMessageId,
      startedAt: run.startedAt,
      aiText: run.candidateText ?? null,
      humanReply,
      humanResponseSeconds: humanReply ? Math.round((humanReply.at.getTime() - trigger.createdAt.getTime()) / 1000) : null,
      aiDurationMs: run.durationMs ?? null,
      handoffProposed: handoffReason !== null,
      forbiddenAttempt: run.guardrailOk === false,
      missingInformation:
        run.outcome === "MODEL_ERROR" || run.outcome === "INTERNAL_ERROR" || handoffReason === "AI_UNCERTAIN",
      costUsd: run.estimatedCostUsd ?? null,
    });
  }
  return rows;
}

export type QualitySummary = {
  runs: number;
  comparedWithHuman: number;
  handoffProposed: number;
  forbiddenAttempts: number;
  missingInformation: number;
  avgAiDurationMs: number | null;
  avgHumanResponseSeconds: number | null;
  totalCostUsd: number | null;
  avgCostUsd: number | null;
};

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;

export function summarizeQuality(rows: QualityRow[]): QualitySummary {
  const costs = rows.map((row) => row.costUsd).filter((value): value is number => typeof value === "number");
  const total = costs.length ? Math.round(costs.reduce((sum, value) => sum + value, 0) * 1_000_000) / 1_000_000 : null;
  return {
    runs: rows.length,
    comparedWithHuman: rows.filter((row) => row.humanReply).length,
    handoffProposed: rows.filter((row) => row.handoffProposed).length,
    forbiddenAttempts: rows.filter((row) => row.forbiddenAttempt).length,
    missingInformation: rows.filter((row) => row.missingInformation).length,
    avgAiDurationMs: average(rows.map((row) => row.aiDurationMs).filter((v): v is number => typeof v === "number")),
    avgHumanResponseSeconds: average(rows.map((row) => row.humanResponseSeconds).filter((v): v is number => typeof v === "number")),
    totalCostUsd: total,
    avgCostUsd: total === null ? null : Math.round((total / costs.length) * 1_000_000) / 1_000_000,
  };
}
