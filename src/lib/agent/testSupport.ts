import path from "node:path";
import { UniqueConflictError } from "../conversations/errors";
import type { MemoryConversations } from "../conversations/memoryRepo";
import { isPaymentWindowOpen } from "../bookingRules";
import type { SecureUnitSettings, UnitAgentConfig } from "./config";
import type { AgentContextReader, RawAgentData } from "./context";
import type {
  ConfirmableStatus,
  ManualPaymentBooking,
  ManualPaymentRecord,
  ManualPaymentStore,
} from "./manualPayment";
import type { ModelClient, ModelRequest, ModelResponse } from "./model";
import type { PaymentHoldBooking, PaymentHoldRecord, PaymentHoldStore } from "./paymentHold";
import type { PromptSource } from "./prompt";
import { staticPromotions, type Promotion } from "./promotions";
import type { ShadowRunRecord, ShadowSink } from "./shadow";
import type {
  ShadowSystemSink,
  SystemEventDataReader,
  SystemPlan,
  TrustedEventData,
} from "./systemEvents";

// Utilitários só dos testes (não importados pelo app).

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
  allowedUrls: ["https://www.example.test", "https://reviews.example.test/avaliar"],
  ...overrides,
});

export const secureSettings: SecureUnitSettings = {
  getLocation: async () => ({ address: SECRET_ADDRESS, mapUrl: SECRET_MAP }),
};

export const noLocationSettings: SecureUnitSettings = { getLocation: async () => null };

export const birthdayPromotion: Promotion = {
  id: "promo-teste",
  name: "Promoção de teste",
  priceBrl: 750,
  criteria: ["somente no topo", "corte alto", "extensão sintética"],
  validUntil: "2026-10-31",
  requiresStaffConfirmation: true,
};

export const promoProvider = (promotions: Promotion[] = [birthdayPromotion]) => staticPromotions(promotions);

export const fixedPromptSource = (text = "# 1. IDENTIDADE E MISSÃO\n\nVocê é a atendente virtual.\n"): PromptSource => ({
  load: async () => text,
});

// ---- modelo roteirizado -----------------------------------------------------
export class ScriptedModel implements ModelClient {
  calls: ModelRequest[] = [];
  constructor(
    private readonly respond: (request: ModelRequest, callIndex: number) => ModelResponse | Promise<ModelResponse>,
  ) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.calls.push(request);
    return this.respond(request, this.calls.length - 1);
  }
}

export const replyWith = (text: string, toolCalls: ModelResponse["toolCalls"] = []) =>
  new ScriptedModel(() => ({ text, toolCalls }));

// ---- sinks em memória -------------------------------------------------------
export class MemoryShadowSink implements ShadowSink {
  records: ShadowRunRecord[] = [];
  private claimed = new Set<string>();
  async claim(key: string) {
    if (this.claimed.has(key)) return false;
    this.claimed.add(key);
    return true;
  }
  async complete(record: ShadowRunRecord) {
    this.records.push(record);
  }
}

export class MemoryShadowSystemSink implements ShadowSystemSink {
  plans: SystemPlan[] = [];
  private claimed = new Set<string>();
  async claim(eventId: string) {
    if (this.claimed.has(eventId)) return false;
    this.claimed.add(eventId);
    return true;
  }
  async record(plan: SystemPlan) {
    this.plans.push(plan);
  }
}

// ---- leitor de contexto em memória -----------------------------------------
export class MemoryContextReader implements AgentContextReader {
  promotions: Promotion[] = [];
  upcomingConfirmedBooking: RawAgentData["upcomingConfirmedBooking"] = null;
  unit: UnitAgentConfig;

  constructor(
    private readonly db: MemoryConversations,
    unitId: string,
  ) {
    this.unit = unitConfig(unitId);
  }

  async load(conversationId: string): Promise<RawAgentData | null> {
    const conversation = this.db.conversations.find((c) => c.id === conversationId);
    if (!conversation) return null;
    const customer = this.db.customers.find((c) => c.id === conversation.customerId);
    const messages = this.db.messages.filter((m) => m.conversationId === conversationId);
    const transitions = this.db.transitions.filter((t) => t.conversationId === conversationId);
    const active = this.db.handoffs.filter(
      (h) => h.conversationId === conversationId && (h.status === "OPEN" || h.status === "CLAIMED"),
    );
    return {
      conversation: { ...conversation },
      customerName: customer?.name ?? null,
      unit: this.unit,
      promotions: this.promotions,
      recentMessages: messages,
      outboundMessageCount: messages.filter((m) => m.direction === "OUTBOUND").length,
      lastTransition: transitions[transitions.length - 1] ?? null,
      activeHandoff: active[active.length - 1] ?? null,
      upcomingConfirmedBooking: this.upcomingConfirmedBooking,
    };
  }
}

export class MemorySystemEventReader implements SystemEventDataReader {
  constructor(public data: TrustedEventData | null) {}
  async load() {
    return this.data;
  }
}

// ---- pagamento manual / extensão de prazo em memória -----------------------
type MutableBooking = ManualPaymentBooking;

export class MemoryManualPaymentStore implements ManualPaymentStore {
  bookings = new Map<string, MutableBooking>();
  records: ManualPaymentRecord[] = [];
  others: { status: string; createdAt: Date; scheduledStart: Date; scheduledEnd: Date }[] = [];

  addBooking(booking: Partial<MutableBooking> & { id: string }): MutableBooking {
    const full: MutableBooking = {
      status: "PENDING_PAYMENT",
      depositAmountBrl: 50,
      createdAt: new Date("2026-10-01T12:00:00-03:00"),
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
  async findByIdempotencyKey(key: string) {
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
  async confirm(args: { bookingId: string; fromStatuses: ConfirmableStatus[]; record: ManualPaymentRecord }) {
    if (this.records.some((r) => r.idempotencyKey === args.record.idempotencyKey)) {
      throw new UniqueConflictError();
    }
    const booking = this.bookings.get(args.bookingId);
    if (!booking || !(args.fromStatuses as string[]).includes(booking.status)) return false;
    booking.status = "CONFIRMED";
    this.records.push(args.record);
    return true;
  }
}

export class MemoryPaymentHoldStore implements PaymentHoldStore {
  bookings = new Map<string, PaymentHoldBooking>();
  holds: PaymentHoldRecord[] = [];

  addBooking(booking: Partial<PaymentHoldBooking> & { id: string }): PaymentHoldBooking {
    const full: PaymentHoldBooking = {
      status: "PENDING_PAYMENT",
      createdAt: new Date("2026-10-01T12:00:00-03:00"),
      scheduledStart: new Date("2026-10-07T10:00:00-03:00"),
      ...booking,
    };
    this.bookings.set(full.id, full);
    return full;
  }
  async findBooking(id: string) {
    const b = this.bookings.get(id);
    return b ? { ...b } : null;
  }
  async latestHold(bookingId: string) {
    const mine = this.holds.filter((h) => h.bookingId === bookingId);
    return mine[mine.length - 1] ?? null;
  }
  async findByIdempotencyKey(key: string) {
    return this.holds.find((h) => h.idempotencyKey === key) ?? null;
  }
  async record(hold: PaymentHoldRecord) {
    if (this.holds.some((h) => h.idempotencyKey === hold.idempotencyKey)) throw new UniqueConflictError();
    this.holds.push(hold);
  }
}
