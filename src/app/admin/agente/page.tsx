import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatDateTimeBR } from "@/lib/format";
import { summarizeRuns, type RunForMetrics } from "@/lib/agent/metrics";
import { shortSha } from "@/lib/agent/promptVersion";

// Painel interno do agente em MODO SOMBRA. Protegido pelo login do admin
// (src/proxy.ts cobre /admin/*). Somente leitura, renderizado no servidor: não
// há rota de API nem dado exposto publicamente. Mostra o que a IA TERIA
// respondido; nada disso foi enviado a clientes.

export const dynamic = "force-dynamic";

const OUTCOME_LABEL: Record<string, string> = {
  DRAFT_SAVED: "Rascunho",
  DRAFT_BLOCKED: "Bloqueado (guardrail)",
  NOTHING_TO_ANSWER: "Nada a responder",
  DISCARDED_MODE_CHANGED: "Descartado (equipe assumiu)",
  CONTEXT_UNAVAILABLE: "Sem contexto",
  MODEL_ERROR: "Erro do modelo",
  INTERNAL_ERROR: "Erro interno",
};

function violationCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { code: string; severity: string } => typeof v === "object" && v !== null && "code" in v)
    .filter((v) => v.severity === "block")
    .map((v) => v.code);
}

function handoffReason(value: unknown): string | null {
  return typeof value === "object" && value !== null && "reason" in value ? String((value as { reason: unknown }).reason) : null;
}

export default async function AgentShadowPage() {
  const [runs, sample] = await Promise.all([
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        startedAt: true,
        trigger: true,
        replayLabel: true,
        outcome: true,
        intent: true,
        temperature: true,
        candidateText: true,
        guardrailOk: true,
        violations: true,
        proposedHandoff: true,
        modelId: true,
        durationMs: true,
        errorCode: true,
        promptVersion: { select: { name: true, sha256: true } },
      },
    }),
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 500,
      select: { outcome: true, intent: true, durationMs: true, proposedHandoff: true, candidateText: true, trigger: true },
    }),
  ]);

  const metrics = summarizeRuns(
    sample.map(
      (run): RunForMetrics => ({
        outcome: run.outcome ?? undefined,
        intent: run.intent,
        durationMs: run.durationMs ?? undefined,
        proposedHandoff: (run.proposedHandoff as RunForMetrics["proposedHandoff"]) ?? null,
        candidateText: run.candidateText,
        trigger: run.trigger,
      }),
    ),
  );

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide text-brand-white/50">{label}</p>
      <p className="mt-1 text-lg text-brand-white">{value}</p>
    </div>
  );
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Agente (modo sombra)</h1>
      <p className="mt-2 text-sm text-brand-white/60">
        Respostas que a IA teria dado. Nada aqui foi enviado a clientes. Últimas {sample.length} execuções nas métricas.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Execuções", String(metrics.completed))}
        {stat("Handoff proposto", pct(metrics.handoffRate))}
        {stat("Bloqueio por guardrail", pct(metrics.guardrailBlockRate))}
        {stat("Erros", String(metrics.errors))}
        {stat("Sem resposta candidata", String(metrics.withoutCandidate))}
        {stat("Tempo médio", metrics.durationMs.avg === null ? "—" : `${metrics.durationMs.avg} ms`)}
        {stat("Tempo p95", metrics.durationMs.p95 === null ? "—" : `${metrics.durationMs.p95} ms`)}
        {stat(
          "Intenções",
          Object.entries(metrics.intents)
            .map(([intent, count]) => `${intent}: ${count}`)
            .join(" · ") || "—",
        )}
      </div>

      {runs.length === 0 && <p className="mt-8 text-sm text-brand-white/60">Nenhuma execução registrada ainda.</p>}

      <ul className="mt-8 space-y-4">
        {runs.map((run) => {
          const blocked = violationCodes(run.violations);
          const handoff = handoffReason(run.proposedHandoff);
          return (
            <li key={run.id} className="rounded-lg border border-white/10 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-white/60">
                <span>{formatDateTimeBR(run.startedAt)}</span>
                <span className="font-semibold text-brand-white">{run.outcome ? OUTCOME_LABEL[run.outcome] : "Em execução"}</span>
                <span>{run.trigger === "REPLAY" ? `Replay (${run.replayLabel})` : "Mensagem"}</span>
                <span>
                  Prompt {run.promptVersion.name} · {shortSha(run.promptVersion.sha256)}
                </span>
                <span>{run.modelId}</span>
                {run.durationMs !== null && <span>{run.durationMs} ms</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-brand-white/80">
                <span>Intenção: {run.intent ?? "—"}</span>
                <span>Temperatura: {run.temperature ?? "—"}</span>
                <span>Guardrail: {run.guardrailOk === null ? "—" : run.guardrailOk ? "ok" : `bloqueado (${blocked.join(", ")})`}</span>
                <span>Handoff sugerido: {handoff ?? "—"}</span>
                {run.errorCode && <span>Erro: {run.errorCode}</span>}
              </div>
              {run.candidateText && (
                <p className="mt-3 whitespace-pre-wrap rounded bg-white/5 p-3 text-sm text-brand-white">{run.candidateText}</p>
              )}
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
