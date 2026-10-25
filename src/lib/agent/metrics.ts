import type { AgentRunOutcome, StoredAgentRun } from "./runs";

// Métricas de sombra calculadas a partir dos AgentRuns. Medem o AGENTE (taxa de
// handoff, bloqueio, erros, tempo), nunca o cliente: não há nota, ranking nem
// pontuação de pessoas.

export type RunForMetrics = Pick<
  StoredAgentRun,
  "outcome" | "intent" | "durationMs" | "proposedHandoff" | "candidateText" | "trigger"
>;

export type ShadowMetrics = {
  total: number;
  completed: number;
  byOutcome: Partial<Record<AgentRunOutcome, number>>;
  /** Execuções com rascunho (salvo ou bloqueado). */
  drafts: number;
  /** % dos rascunhos com handoff proposto. */
  handoffRate: number | null;
  /** % dos rascunhos bloqueados pelos guardrails. */
  guardrailBlockRate: number | null;
  /** Execuções concluídas sem resposta candidata (nada a responder, descarte, erro). */
  withoutCandidate: number;
  errors: number;
  intents: Record<string, number>;
  durationMs: { avg: number | null; p95: number | null; max: number | null };
};

const ratio = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 10);

export function summarizeRuns(runs: RunForMetrics[]): ShadowMetrics {
  const completed = runs.filter((run) => run.outcome);
  const byOutcome: ShadowMetrics["byOutcome"] = {};
  for (const run of completed) byOutcome[run.outcome!] = (byOutcome[run.outcome!] ?? 0) + 1;

  const drafts = completed.filter((run) => run.outcome === "DRAFT_SAVED" || run.outcome === "DRAFT_BLOCKED");
  const blocked = drafts.filter((run) => run.outcome === "DRAFT_BLOCKED").length;
  const withHandoff = drafts.filter((run) => run.proposedHandoff).length;

  const intents: Record<string, number> = {};
  for (const run of completed) if (run.intent) intents[run.intent] = (intents[run.intent] ?? 0) + 1;

  const durations = completed
    .map((run) => run.durationMs)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const avg = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const p95 = durations.length ? durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)] : null;

  return {
    total: runs.length,
    completed: completed.length,
    byOutcome,
    drafts: drafts.length,
    handoffRate: ratio(withHandoff, drafts.length),
    guardrailBlockRate: ratio(blocked, drafts.length),
    withoutCandidate: completed.filter((run) => !run.candidateText).length,
    errors: completed.filter((run) => run.outcome === "MODEL_ERROR" || run.outcome === "INTERNAL_ERROR").length,
    intents,
    durationMs: { avg, p95, max: durations.length ? durations[durations.length - 1] : null },
  };
}

export type PromptComparison = {
  promptVersionId: string;
  promptName: string | null;
  promptSha256: string | null;
  runs: StoredAgentRun[];
}[];

/**
 * Agrupa as execuções de UMA mensagem por versão do prompt (ex.: V2 × V3), na
 * ordem em que cada versão apareceu. Base para a futura tela de comparação.
 */
export function compareByPromptVersion(runs: StoredAgentRun[]): PromptComparison {
  const groups = new Map<string, PromptComparison[number]>();
  for (const run of [...runs].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())) {
    const group = groups.get(run.promptVersionId) ?? {
      promptVersionId: run.promptVersionId,
      promptName: run.promptVersion?.name ?? null,
      promptSha256: run.promptVersion?.sha256 ?? null,
      runs: [],
    };
    group.runs.push(run);
    groups.set(run.promptVersionId, group);
  }
  return [...groups.values()];
}
