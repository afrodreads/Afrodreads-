import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatDateTimeBR } from "@/lib/format";
import { summarizeRuns, type RunForMetrics } from "@/lib/agent/metrics";
import { shortSha } from "@/lib/agent/promptVersion";
import { pairRunsWithHumanReplies, summarizeQuality } from "@/lib/agent/quality";

// Painel interno do agente em MODO SOMBRA. Protegido pelo login do admin
// (src/proxy.ts cobre /admin/*). Somente leitura, renderizado no servidor: não
// há rota de API nem dado exposto publicamente. Mostra o que a IA TERIA
// respondido; nada disso foi enviado a clientes. Mede o agente, não as pessoas.

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

const usd = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `US$ ${value.toFixed(4)}`);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Relógio fora do componente (a regra do React não permite chamar Date.now() na renderização). */
async function loadAgentPanelData(now: number) {
  const since = new Date(now - 7 * DAY_MS);
  const lastDay = new Date(now - DAY_MS);
  return { since, lastDay };
}

export default async function AgentShadowPage() {
  const { since, lastDay } = await loadAgentPanelData(new Date().getTime());
  const [runs, sample, inboundCount, inboundRecent] = await Promise.all([
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { promptVersion: { select: { name: true, sha256: true } } },
    }),
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 500,
      select: {
        outcome: true,
        intent: true,
        durationMs: true,
        proposedHandoff: true,
        candidateText: true,
        trigger: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
      },
    }),
    prisma.message.count({ where: { direction: "INBOUND", createdAt: { gte: since } } }),
    prisma.message.count({ where: { direction: "INBOUND", createdAt: { gte: lastDay } } }),
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
  const tokens = sample.reduce((sum, run) => sum + (run.inputTokens ?? 0) + (run.outputTokens ?? 0), 0);
  const cost = sample.reduce((sum, run) => sum + (run.estimatedCostUsd === null ? 0 : Number(run.estimatedCostUsd)), 0);

  // Comparação IA × equipe nas conversas das execuções listadas.
  const conversationIds = [...new Set(runs.map((run) => run.conversationId))];
  const messages = conversationIds.length
    ? await prisma.message.findMany({
        where: { conversationId: { in: conversationIds } },
        orderBy: { createdAt: "asc" },
        take: 2000,
      })
    : [];
  const quality = pairRunsWithHumanReplies(
    runs.map((run) => ({
      ...run,
      outcome: run.outcome ?? undefined,
      mode: null, // (o "modo" do AgentRun é sempre SHADOW; aqui o campo é o modo da conversa)
      agentStatus: null,
      qualification: null,
      violations: [],
      proposedHandoff: (run.proposedHandoff as { reason: string; summary: unknown } | null) ?? null,
      proposedActions: [],
      rejectedToolCalls: [],
      contextSnapshot: null,
      durationMs: run.durationMs ?? undefined,
      completedAt: run.completedAt ?? undefined,
      estimatedCostUsd: run.estimatedCostUsd === null ? null : Number(run.estimatedCostUsd),
    })),
    messages,
  );
  const qualitySummary = summarizeQuality(quality);
  const humanByRun = new Map(quality.map((row) => [row.runId, row]));

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
        Respostas que a IA teria dado. Nada aqui foi enviado a clientes. Métricas das últimas {sample.length} execuções.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Mensagens recebidas (24h / 7d)", `${inboundRecent} / ${inboundCount}`)}
        {stat("Execuções", String(metrics.completed))}
        {stat("Handoff proposto", pct(metrics.handoffRate))}
        {stat("Bloqueio por guardrail", pct(metrics.guardrailBlockRate))}
        {stat("Erros", String(metrics.errors))}
        {stat("Sem resposta candidata", String(metrics.withoutCandidate))}
        {stat("Tempo médio / p95", metrics.durationMs.avg === null ? "—" : `${metrics.durationMs.avg} / ${metrics.durationMs.p95} ms`)}
        {stat("Tokens / custo estimado", `${tokens.toLocaleString("pt-BR")} / ${usd(cost)}`)}
        {stat(
          "Intenções",
          Object.entries(metrics.intents)
            .map(([intent, count]) => `${intent}: ${count}`)
            .join(" · ") || "—",
        )}
      </div>

      <h2 className="mt-10 font-display text-xl uppercase text-brand-white">IA × resposta real da equipe</h2>
      <p className="mt-1 text-sm text-brand-white/60">
        {qualitySummary.comparedWithHuman} de {qualitySummary.runs} rascunhos têm resposta da equipe para comparar ·
        tentativas proibidas bloqueadas: {qualitySummary.forbiddenAttempts} · faltou informação: {qualitySummary.missingInformation} ·
        custo médio por rascunho: {usd(qualitySummary.avgCostUsd)}
      </p>

      {runs.length === 0 && <p className="mt-8 text-sm text-brand-white/60">Nenhuma execução registrada ainda.</p>}

      <ul className="mt-6 space-y-4">
        {runs.map((run) => {
          const blocked = violationCodes(run.violations);
          const handoff = handoffReason(run.proposedHandoff);
          const human = humanByRun.get(run.id)?.humanReply ?? null;
          return (
            <li key={run.id} className="rounded-lg border border-white/10 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-white/60">
                <span>{formatDateTimeBR(run.startedAt)}</span>
                <span className="font-semibold text-brand-white">{run.outcome ? OUTCOME_LABEL[run.outcome] : "Em execução"}</span>
                <span>{run.trigger === "REPLAY" ? `Replay (${run.replayLabel})` : "Mensagem"}</span>
                <span>
                  Prompt {run.promptVersion.name} · {shortSha(run.promptVersion.sha256)}
                </span>
                <span>{run.servedModel ?? run.modelId}</span>
                {run.durationMs !== null && <span>{run.durationMs} ms</span>}
                {run.inputTokens !== null && (
                  <span>
                    {run.inputTokens}+{run.outputTokens} tokens (cache {run.cacheReadTokens ?? 0})
                  </span>
                )}
                <span>{usd(run.estimatedCostUsd === null ? null : Number(run.estimatedCostUsd))}</span>
                {run.groupedMessageCount !== null && run.groupedMessageCount > 1 && (
                  <span>{run.groupedMessageCount} mensagens agrupadas</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-brand-white/80">
                <span>Intenção: {run.intent ?? "—"}</span>
                <span>Temperatura: {run.temperature ?? "—"}</span>
                <span>Guardrail: {run.guardrailOk === null ? "—" : run.guardrailOk ? "ok" : `bloqueado (${blocked.join(", ")})`}</span>
                <span>Handoff sugerido: {handoff ?? "—"}</span>
                {run.errorCode && <span>Erro: {run.errorCode}</span>}
              </div>
              {run.candidateText && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-white/50">IA (rascunho, não enviado)</p>
                    <p className="mt-1 whitespace-pre-wrap rounded bg-white/5 p-3 text-sm text-brand-white">{run.candidateText}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-white/50">Equipe (enviado de verdade)</p>
                    <p className="mt-1 whitespace-pre-wrap rounded bg-white/5 p-3 text-sm text-brand-white/80">
                      {human ? human.text : "—"}
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
