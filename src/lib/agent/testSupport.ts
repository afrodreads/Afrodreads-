import path from "node:path";
import { UniqueConflictError } from "../conversations/errors";
import { MemoryConversations } from "../conversations/memoryRepo";
import { receiveInboundMessage } from "../conversations/message";
import type { LiveDeps, ReplayDeps } from "./orchestrator";
import { isPaymentWindowOpen } from "../bookingRules";
import type { StaffRecord } from "./actors";
import type { SecureUnitSettings, UnitAgentConfig } from "./config";
import { modeFromLastTransition, type AgentContextReader, type ContextLoadOptions, type RawAgentData } from "./context";
import type {
  ConfirmableStatus,
  ManualPaymentBooking,
  ManualPaymentRecord,
  ManualPaymentStore,
} from "./manualPayment";
import type { ModelClient, ModelRequest, ModelResponse } from "./model";
import type { PaymentHoldBooking, PaymentHoldRecord, PaymentHoldStore } from "./paymentHold";
import type { PromptSource } from "./prompt";
import { promptSpecFrom, type PromptRegistry, type PromptSpec } from "./promptVersion";
import type { Promotion } from "./promotions";
import type { AgentRunResult, AgentRunStore, NewAgentRun, StoredAgentRun } from "./runs";
import type {
  NewSystemEvent,
  StoredSystemEvent,
  SystemEventDataReader,
  SystemEventFinish,
  SystemEventStore,
  TrustedEventData,
} from "./systemEvents";

// Utilitários só dos testes (não importados pelo app). As implementações em
// memória respeitam as mesmas garantias dos adaptadores do banco: unicidade por
// chave, reserva atômica e escrita condicional.

export const V2_PATH = path.resolve(__dirname, "..", "..", "..", "agente", "00-prompt-do-agente-v2.md");

export const SECRET_ADDRESS = "Rua Exemplo Secreta 123, Bairro Teste";
export const SECRET_MAP = "https://maps.example.test/segredo";

export const unitConfig = (unitId: string, overrides: Partial<UnitAgentConfig> = {}): UnitAgentConfig => ({
  unitId,
  displayName: "Unidade Teste",
  publicArea: "Bairro Teste",
  humanHoursText: "segunda a sexta, das 10h às 21h",
  humanName: "Atendente Teste",
  reviewUrl: "https://reviews.example.test/avaliar",
  parkingInfo: "Temos estacionamento no local.",
  allowedUrls: ["https://www.example.test", "https://reviews.example.test/avaliar"],
  ...overrides,
});

export const secureSettings: SecureUnitSettings = {
  getLocation: async () => ({ address: SECRET_ADDRESS, mapUrl: SECRET_MAP }),
};
export const noLocationSettings: SecureUnitSettings = { getLocation: async () => null };

export const promotion = (unitId: string, overrides: Partial<Promotion> = {}): Promotion => ({
  id: "promo-teste",
  unitId,
  name: "Promoção de teste",
  active: true,
  startsOn: null,
  endsOn: "2026-10-31",
  priceBrl: 750,
  rules: ["somente no topo", "corte alto", "extensão sintética"],
  conditions: null,
  serviceSlug: null,
  requiresStaffConfirmation: true,
  ...overrides,
});

export const PROMPT_V_TEST = "# PROMPT DE TESTE V7\n\n# 1. IDENTIDADE E MISSÃO\n\nVocê é a atendente virtual.\n";

export const fixedPromptSource = (text = PROMPT_V_TEST): PromptSource => ({
  load: async () => promptSpecFrom(text, "memoria"),
});

// ---- modelo roteirizado -----------------------------------------------------
export class ScriptedModel implements ModelClient {
  calls: ModelRequest[] = [];
  constructor(
    private readonly respond: (request: ModelRequest, callIndex: number) => ModelResponse | Promise<ModelResponse>,
    readonly id = "modelo-roteirizado-v1",
  ) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.calls.push(request);
    return this.respond(request, this.calls.length - 1);
  }
}

export const replyWith = (text: string, toolCalls: ModelResponse["toolCalls"] = [], id?: string) =>
  new ScriptedModel(() => ({ text, toolCalls }), id);

// ---- versões de prompt e AgentRuns -----------------------------------------
export class MemoryPromptRegistry implements PromptRegistry {
  versions = new Map<string, { id: string; spec: PromptSpec }>();
  async ensure(spec: PromptSpec) {
    const found = this.versions.get(spec.sha256);
    if (found) return found.id;
    const id = `prompt-${this.versions.size + 1}`;
    this.versions.set(spec.sha256, { id, spec });
    return id;
  }
  byId(id: string) {
    return [...this.versions.values()].find((v) => v.id === id)?.spec ?? null;
  }
}

export class MemoryAgentRunStore implements AgentRunStore {
  runs: StoredAgentRun[] = [];
  constructor(private readonly prompts?: MemoryPromptRegistry) {}

  async create(run: NewAgentRun) {
    const existing = this.runs.find((r) => r.idempotencyKey === run.idempotencyKey);
    if (existing) return { created: false, id: existing.id };
    const spec = this.prompts?.byId(run.promptVersionId) ?? null;
    const stored: StoredAgentRun = {
      ...run,
      id: `run-${this.runs.length + 1}`,
      promptVersion: spec ? { name: spec.name, sha256: spec.sha256 } : null,
    };
    this.runs.push(stored);
    return { created: true, id: stored.id };
  }
  async complete(id: string, result: AgentRunResult) {
    const run = this.runs.find((r) => r.id === id);
    if (run) Object.assign(run, result);
  }
  async find(id: string) {
    return this.runs.find((r) => r.id === id) ?? null;
  }
  async listForMessage(messageId: string) {
    return this.runs.filter((r) => r.triggerMessageId === messageId);
  }
}

// ---- leitor de contexto em memória -----------------------------------------
export class MemoryContextReader implements AgentContextReader {
  promotions: Promotion[] = [];
  upcomingConfirmedBooking: RawAgentData["upcomingConfirmedBooking"] = null;
  units = new Map<string, UnitAgentConfig>();

  constructor(private readonly db: MemoryConversations) {}

  unit(unitId: string) {
    const existing = this.units.get(unitId);
    if (existing) return existing;
    const created = unitConfig(unitId);
    this.units.set(unitId, created);
    return created;
  }

  async findMessage(id: string) {
    const message = this.db.messages.find((m) => m.id === id);
    return message ? { id: message.id, conversationId: message.conversationId, sender: message.sender, createdAt: message.createdAt } : null;
  }

  async load(conversationId: string, options: ContextLoadOptions = {}): Promise<RawAgentData | null> {
    const conversation = this.db.conversations.find((c) => c.id === conversationId);
    if (!conversation) return null;
    const customer = this.db.customers.find((c) => c.id === conversation.customerId);

    let messages = this.db.messages.filter((m) => m.conversationId === conversationId);
    let transitions = this.db.transitions.filter((t) => t.conversationId === conversationId);
    if (options.upToMessageId) {
      const index = messages.findIndex((m) => m.id === options.upToMessageId);
      if (index === -1) return null;
      const trigger = messages[index];
      messages = messages.slice(0, index + 1);
      transitions = transitions.filter((t) => t.createdAt.getTime() <= trigger.createdAt.getTime());
    }
    const active = this.db.handoffs.filter(
      (h) => h.conversationId === conversationId && (h.status === "OPEN" || h.status === "CLAIMED"),
    );
    const lastTransition = transitions[transitions.length - 1] ?? null;

    return {
      conversation: { ...conversation },
      unitId: conversation.unitId,
      customerName: customer?.name ?? null,
      unit: this.unit(conversation.unitId),
      promotions: this.promotions,
      recentMessages: messages,
      outboundMessageCount: messages.filter((m) => m.direction === "OUTBOUND").length,
      lastTransition,
      activeHandoff: active[active.length - 1] ?? null,
      upcomingConfirmedBooking: this.upcomingConfirmedBooking,
      modeAtTrigger: modeFromLastTransition(lastTransition),
    };
  }
}

// ---- fila de eventos SYSTEM em memória -------------------------------------
export class MemorySystemEventStore implements SystemEventStore {
  events: StoredSystemEvent[] = [];

  async enqueue(event: NewSystemEvent, now: Date) {
    const existing = this.events.find((e) => e.idempotencyKey === event.idempotencyKey);
    if (existing) return { id: existing.id, created: false };
    const stored: StoredSystemEvent = {
      ...event,
      id: `event-${this.events.length + 1}`,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      plan: null,
      missing: [],
      skippedReason: null,
      createdAt: now,
      updatedAt: now,
      processedAt: null,
    };
    this.events.push(stored);
    return { id: stored.id, created: true };
  }

  async claim(id: string, now: Date, options: { maxAttempts: number; leaseMs: number }) {
    const event = this.events.find((e) => e.id === id);
    if (!event) return null;
    const claimable =
      event.status === "PENDING" ||
      (event.status === "FAILED" && event.attempts < options.maxAttempts) ||
      (event.status === "PROCESSING" && event.updatedAt.getTime() < now.getTime() - options.leaseMs);
    if (!claimable) return null;
    event.status = "PROCESSING";
    event.attempts += 1;
    event.updatedAt = now;
    return { ...event };
  }

  async finish(id: string, result: SystemEventFinish, now: Date) {
    const event = this.events.find((e) => e.id === id);
    if (!event) return;
    event.status = result.status;
    event.plan = result.plan;
    event.missing = result.missing;
    event.skippedReason = result.skippedReason;
    event.lastError = result.error;
    event.updatedAt = now;
    if (result.status !== "FAILED") event.processedAt = now;
  }

  async find(id: string) {
    return this.events.find((e) => e.id === id) ?? null;
  }
}

export class MemorySystemEventReader implements SystemEventDataReader {
  loads = 0;
  constructor(public data: TrustedEventData | null) {}
  async load() {
    this.loads += 1;
    return this.data;
  }
}

// ---- equipe, pagamento manual e prazo em memória --------------------------
export const staff = (overrides: Partial<StaffRecord> = {}): StaffRecord => ({
  id: "staff-1",
  name: "Pessoa da Equipe",
  role: "ATTENDANT",
  unitId: "unit-a",
  active: true,
  ...overrides,
});

class StaffBase {
  staff = new Map<string, StaffRecord>();
  addStaff(record: StaffRecord) {
    this.staff.set(record.id, record);
    return record;
  }
  async findStaff(id: string) {
    return this.staff.get(id) ?? null;
  }
}

export class MemoryManualPaymentStore extends StaffBase implements ManualPaymentStore {
  bookings = new Map<string, ManualPaymentBooking>();
  records: ManualPaymentRecord[] = [];
  outbox: NewSystemEvent[] = [];
  others: { status: string; createdAt: Date; paymentDueAt: Date | null; scheduledStart: Date; scheduledEnd: Date }[] = [];

  addBooking(booking: Partial<ManualPaymentBooking> & { id: string }): ManualPaymentBooking {
    const full: ManualPaymentBooking = {
      status: "PENDING_PAYMENT",
      unitId: "unit-a",
      depositAmountBrl: 50,
      createdAt: new Date("2026-10-01T12:00:00-03:00"),
      paymentDueAt: null,
      scheduledStart: new Date("2026-10-07T10:00:00-03:00"),
      scheduledEnd: new Date("2026-10-07T15:00:00-03:00"),
      ...booking,
    };
    this.bookings.set(full.id, full);
    return full;
  }
  async findBooking(id: string) {
    const b = this.bookings.get(id);
    return b ? { ...b } : null;
  }
  async findConfirmationByIdempotencyKey(key: string) {
    return this.records.find((r) => r.idempotencyKey === key) ?? null;
  }
  async hasOtherActiveBooking(booking: ManualPaymentBooking, now: Date) {
    return this.others.some(
      (o) =>
        (o.status === "CONFIRMED" || isPaymentWindowOpen(o, now)) &&
        o.scheduledStart < booking.scheduledEnd &&
        o.scheduledEnd > booking.scheduledStart,
    );
  }
  async confirm(args: { fromStatuses: ConfirmableStatus[]; record: ManualPaymentRecord; event: NewSystemEvent }) {
    if (this.records.some((r) => r.idempotencyKey === args.record.idempotencyKey)) throw new UniqueConflictError();
    const booking = this.bookings.get(args.record.bookingId);
    if (!booking || !(args.fromStatuses as string[]).includes(booking.status)) return false;
    booking.status = "CONFIRMED";
    this.records.push(args.record);
    if (!this.outbox.some((e) => e.idempotencyKey === args.event.idempotencyKey)) this.outbox.push(args.event);
    return true;
  }
}

export class MemoryPaymentHoldStore extends StaffBase implements PaymentHoldStore {
  bookings = new Map<string, PaymentHoldBooking>();
  holds: PaymentHoldRecord[] = [];

  addBooking(booking: Partial<PaymentHoldBooking> & { id: string }): PaymentHoldBooking {
    const full: PaymentHoldBooking = {
      status: "PENDING_PAYMENT",
      unitId: "unit-a",
      createdAt: new Date("2026-10-01T12:00:00-03:00"),
      scheduledStart: new Date("2026-10-07T10:00:00-03:00"),
      paymentDueAt: null,
      ...booking,
    };
    this.bookings.set(full.id, full);
    return full;
  }
  async findBooking(id: string) {
    const b = this.bookings.get(id);
    return b ? { ...b } : null;
  }
  async findHoldByIdempotencyKey(key: string) {
    return this.holds.find((h) => h.idempotencyKey === key) ?? null;
  }
  async applyHold(args: { expectedDueAt: Date | null; record: PaymentHoldRecord }) {
    if (this.holds.some((h) => h.idempotencyKey === args.record.idempotencyKey)) throw new UniqueConflictError();
    const booking = this.bookings.get(args.record.bookingId);
    const sameDue = (booking?.paymentDueAt?.getTime() ?? null) === (args.expectedDueAt?.getTime() ?? null);
    if (!booking || booking.status !== "PENDING_PAYMENT" || !sameDue) return false;
    booking.paymentDueAt = args.record.newDeadline;
    this.holds.push(args.record);
    return true;
  }
}

// ---- harness do agente em sombra -------------------------------------------
export const HARNESS_NOW = new Date("2026-10-01T15:30:00-03:00");

export function agentHarness(model: ScriptedModel, promptText = PROMPT_V_TEST) {
  const db = new MemoryConversations();
  const unit = db.addUnit({ slug: "principal" });
  const reader = new MemoryContextReader(db);
  const prompts = new MemoryPromptRegistry();
  const runs = new MemoryAgentRunStore(prompts);
  let tick = 0;
  const clock = () => (tick += 5);
  const live: LiveDeps = {
    config: { mode: "shadow" },
    store: db,
    reader,
    model,
    prompt: fixedPromptSource(promptText),
    prompts,
    runs,
    clock,
  };
  const replayDeps = (overrides: Partial<ReplayDeps> = {}): ReplayDeps => ({
    config: { mode: "shadow" },
    reader,
    messages: reader,
    model,
    prompt: fixedPromptSource(promptText),
    prompts,
    runs,
    clock,
    ...overrides,
  });
  const inbound = (externalMessageId: string, content = "Quanto custa?", now = HARNESS_NOW, unitId = unit.id) =>
    receiveInboundMessage(
      db,
      { unitId, phone: "11987654321", customerName: "Maria", externalMessageId, content },
      now,
    );
  return { db, unit, reader, prompts, runs, live, replayDeps, inbound };
}