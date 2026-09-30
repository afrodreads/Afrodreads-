import type { AgentRun, PromptVersion } from "@prisma/client";
import { prisma } from "../prisma";
import type { PromptRegistry } from "../agent/promptVersion";
import type { AgentRunStore, StoredAgentRun } from "../agent/runs";
import { isUniqueViolation, jsonOrNull } from "./shared";

// Persistência de versões de prompt e de execuções do agente (AgentRun).

export const prismaPromptRegistry: PromptRegistry = {
  async ensure(spec) {
    const existing = await prisma.promptVersion.findUnique({ where: { sha256: spec.sha256 }, select: { id: true } });
    if (existing) return existing.id;
    try {
      const created = await prisma.promptVersion.create({
        data: { name: spec.name, sha256: spec.sha256, sourcePath: spec.sourcePath, content: spec.content },
        select: { id: true },
      });
      return created.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const winner = await prisma.promptVersion.findUniqueOrThrow({ where: { sha256: spec.sha256 }, select: { id: true } });
      return winner.id;
    }
  },
};

type RunRow = AgentRun & { promptVersion: Pick<PromptVersion, "name" | "sha256"> | null };

function toStored(row: RunRow): StoredAgentRun {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    unitId: row.unitId,
    conversationId: row.conversationId,
    triggerMessageId: row.triggerMessageId,
    trigger: row.trigger,
    replayOfRunId: row.replayOfRunId,
    replayLabel: row.replayLabel,
    modelId: row.modelId,
    promptVersionId: row.promptVersionId,
    startedAt: row.startedAt,
    promptVersion: row.promptVersion,
    outcome: row.outcome ?? undefined,
    agentStatus: (row.agentStatus as StoredAgentRun["agentStatus"]) ?? null,
    intent: row.intent,
    temperature: row.temperature,
    qualification: (row.qualification as StoredAgentRun["qualification"]) ?? null,
    candidateText: row.candidateText,
    blockedOriginalText: row.blockedOriginalText,
    guardrailOk: row.guardrailOk,
    violations: (row.violations as StoredAgentRun["violations"]) ?? [],
    proposedHandoff: (row.proposedHandoff as StoredAgentRun["proposedHandoff"]) ?? null,
    proposedActions: (row.proposedActions as StoredAgentRun["proposedActions"]) ?? [],
    rejectedToolCalls: (row.rejectedToolCalls as StoredAgentRun["rejectedToolCalls"]) ?? [],
    contextSnapshot: (row.contextSnapshot as StoredAgentRun["contextSnapshot"]) ?? null,
    durationMs: row.durationMs ?? undefined,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    completedAt: row.completedAt ?? undefined,
  };
}

const withPrompt = { promptVersion: { select: { name: true, sha256: true } } } as const;

export const prismaAgentRunStore: AgentRunStore = {
  async create(run) {
    try {
      const created = await prisma.agentRun.create({ data: { ...run, mode: "SHADOW" }, select: { id: true } });
      return { created: true, id: created.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await prisma.agentRun.findUniqueOrThrow({
        where: { idempotencyKey: run.idempotencyKey },
        select: { id: true },
      });
      return { created: false, id: existing.id };
    }
  },

  async complete(id, result) {
    await prisma.agentRun.update({
      where: { id },
      data: {
        outcome: result.outcome,
        agentStatus: result.agentStatus,
        intent: result.intent,
        temperature: result.temperature,
        qualification: jsonOrNull(result.qualification),
        candidateText: result.candidateText,
        blockedOriginalText: result.blockedOriginalText,
        guardrailOk: result.guardrailOk,
        violations: jsonOrNull(result.violations),
        proposedHandoff: jsonOrNull(result.proposedHandoff),
        proposedActions: jsonOrNull(result.proposedActions),
        rejectedToolCalls: jsonOrNull(result.rejectedToolCalls),
        contextSnapshot: jsonOrNull(result.contextSnapshot),
        durationMs: result.durationMs,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        completedAt: result.completedAt,
      },
    });
  },

  async find(id) {
    const row = await prisma.agentRun.findUnique({ where: { id }, include: withPrompt });
    return row ? toStored(row) : null;
  },

  async listForMessage(messageId) {
    const rows = await prisma.agentRun.findMany({
      where: { triggerMessageId: messageId },
      include: withPrompt,
      orderBy: { startedAt: "asc" },
    });
    return rows.map(toStored);
  },
};
