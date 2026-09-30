import type { SystemEvent } from "@prisma/client";
import { prisma } from "../prisma";
import type { StoredSystemEvent, SystemEventStore, SystemPlan } from "../agent/systemEvents";
import { isUniqueViolation, jsonOrNull, stringList } from "./shared";

// Fila persistente de eventos SYSTEM (outbox). Garantias:
//  - idempotencyKey única: o mesmo evento nunca vira duas linhas;
//  - claim com updateMany condicional: só um processador pega cada evento.

function toStored(row: SystemEvent): StoredSystemEvent {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    type: row.type,
    unitId: row.unitId,
    entityType: row.entityType as StoredSystemEvent["entityType"],
    entityId: row.entityId,
    payload: (row.payload ?? {}) as StoredSystemEvent["payload"],
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    plan: (row.plan as SystemPlan | null) ?? null,
    missing: stringList(row.missing) as StoredSystemEvent["missing"],
    skippedReason: row.skippedReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    processedAt: row.processedAt,
  };
}

export const prismaSystemEventStore: SystemEventStore = {
  async enqueue(event) {
    try {
      const created = await prisma.systemEvent.create({ data: { ...event }, select: { id: true } });
      return { id: created.id, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await prisma.systemEvent.findUniqueOrThrow({
        where: { idempotencyKey: event.idempotencyKey },
        select: { id: true },
      });
      return { id: existing.id, created: false };
    }
  },

  async claim(id, now, options) {
    const { count } = await prisma.systemEvent.updateMany({
      where: {
        id,
        OR: [
          { status: "PENDING" },
          { status: "FAILED", attempts: { lt: options.maxAttempts } },
          { status: "PROCESSING", updatedAt: { lt: new Date(now.getTime() - options.leaseMs) } },
        ],
      },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (count === 0) return null;
    const row = await prisma.systemEvent.findUnique({ where: { id } });
    return row ? toStored(row) : null;
  },

  async finish(id, result, now) {
    await prisma.systemEvent.update({
      where: { id },
      data: {
        status: result.status,
        plan: jsonOrNull(result.plan),
        missing: jsonOrNull(result.missing),
        skippedReason: result.skippedReason,
        lastError: result.error,
        processedAt: result.status === "FAILED" ? null : now,
      },
    });
  },

  async find(id) {
    const row = await prisma.systemEvent.findUnique({ where: { id } });
    return row ? toStored(row) : null;
  },
};
