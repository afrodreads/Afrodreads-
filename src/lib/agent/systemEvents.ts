import { assertShadowMode, type SecureUnitSettings, type UnitAgentConfig } from "./config";

// Eventos SYSTEM: mensagens que NÃO são resposta da IA.
//
//   AI     → gera rascunho, interpreta, qualifica, propõe handoff.
//   SYSTEM → confirma eventos, usa templates fixos, envia (numa fase futura),
//            não interpreta conversa, não inventa dados.
//
// Este módulo não importa nada do agente de IA (modelo, prompt, contexto,
// ferramentas, guardrails): um teste garante a separação.
//
// Fluxo: algo confirmado pela equipe/sistema → `enqueue` (fila persistente,
// chave de idempotência) → `processSystemEvent` (claim atômico, uma ação por
// evento) → plano com templates fixos e dados confiáveis → despachante.
// Nesta fase só existe o despachante de SOMBRA: nada é enviado.

export type SystemEventType = "PAYMENT_CONFIRMED" | "SERVICE_FINISHED";
export type SystemEventStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "SKIPPED" | "FAILED";
export type SystemEntityType = "BOOKING" | "CONVERSATION";

export type NewSystemEvent = {
  idempotencyKey: string;
  type: SystemEventType;
  unitId: string | null;
  entityType: SystemEntityType;
  entityId: string;
  payload: Record<string, string | number | boolean | null>;
};

export type StoredSystemEvent = NewSystemEvent & {
  id: string;
  status: SystemEventStatus;
  attempts: number;
  lastError: string | null;
  plan: SystemPlan | null;
  missing: MissingData[];
  skippedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
};

/** Um agendamento gera UM evento de pagamento confirmado, venha de onde vier. */
export function paymentConfirmedEvent(args: {
  bookingId: string;
  unitId: string | null;
  source: "MANUAL" | "MERCADO_PAGO";
}): NewSystemEvent {
  return {
    idempotencyKey: `payment-confirmed:${args.bookingId}`,
    type: "PAYMENT_CONFIRMED",
    unitId: args.unitId,
    entityType: "BOOKING",
    entityId: args.bookingId,
    payload: { bookingId: args.bookingId, source: args.source },
  };
}

/** Uma finalização (HUMAN → FINISHED) gera UM evento. */
export function serviceFinishedEvent(args: {
  conversationId: string;
  unitId: string;
  finishedAt: Date;
  bookingId?: string | null;
}): NewSystemEvent {
  return {
    idempotencyKey: `service-finished:${args.conversationId}:${args.finishedAt.toISOString()}`,
    type: "SERVICE_FINISHED",
    unitId: args.unitId,
    entityType: "CONVERSATION",
    entityId: args.conversationId,
    payload: { conversationId: args.conversationId, bookingId: args.bookingId ?? null },
  };
}

// ---------------------------------------------------------------------------
// Fila persistente
// ---------------------------------------------------------------------------

export const SYSTEM_EVENT_MAX_ATTEMPTS = 5;
/** Um processamento que travou (queda do servidor) pode ser retomado depois disto. */
export const SYSTEM_EVENT_LEASE_MS = 10 * 60 * 1000;

export type SystemEventFinish = {
  status: "PROCESSED" | "SKIPPED" | "FAILED";
  plan: SystemPlan | null;
  missing: MissingData[];
  skippedReason: string | null;
  error: string | null;
};

export interface SystemEventStore {
  /** Idempotente pela chave: o mesmo evento nunca vira duas linhas. */
  enqueue(event: NewSystemEvent, now: Date): Promise<{ id: string; created: boolean }>;
  /**
   * Reserva ATÔMICA para processar: PENDING, ou FAILED com tentativas
   * sobrando, ou PROCESSING com a reserva vencida. Incrementa `attempts`.
   * null = outro processador pegou ou não há o que fazer.
   */
  claim(id: string, now: Date, options: { maxAttempts: number; leaseMs: number }): Promise<StoredSystemEvent | null>;
  finish(id: string, result: SystemEventFinish, now: Date): Promise<void>;
  find(id: string): Promise<StoredSystemEvent | null>;
}

// ---------------------------------------------------------------------------
// Plano (templates fixos + dados confiáveis)
// ---------------------------------------------------------------------------

export type AppointmentType = "FIRST_APPLICATION" | "MAINTENANCE";

/** Dados confiáveis lidos do backend para montar o plano (não vêm do evento). */
export type TrustedEventData = {
  unitId: string;
  conversationId: string | null;
  conversationMode: "BOT" | "HUMAN" | "FINISHED" | null;
  customerName: string | null;
  bookingStatus: string | null;
  appointmentType: AppointmentType | null;
  unit: UnitAgentConfig | null;
};

export interface SystemEventDataReader {
  load(event: StoredSystemEvent): Promise<TrustedEventData | null>;
}

export type CardId =
  | "cuidados-antes-dos-dreads"
  | "cuidados-antes-da-manutencao"
  | "cuidados-depois-dos-dreads"
  | "manutencao";

export type SystemTemplateId =
  | "payment_confirmed_application"
  | "payment_confirmed_maintenance"
  | "location"
  | "service_finished";

export type SystemMessageItem =
  | { kind: "text"; templateId: SystemTemplateId; text: string }
  | { kind: "card"; cardId: CardId }
  | { kind: "location"; templateId: "location"; text: string; address: string; mapUrl: string };

export type MissingData = "conversation" | "appointment_type" | "location" | "review_url" | "unit_config";

export type SystemPlan = {
  eventId: string;
  eventType: SystemEventType;
  conversationId: string | null;
  items: SystemMessageItem[];
  missing: MissingData[];
  skippedReason: string | null;
};

// Templates fixos (V2 §18/§19). {nome} = nome do cliente no cadastro.
const TEMPLATES = {
  payment_confirmed_application:
    "Seu horário está confirmado, {nome}! 💛 Aqui estão os cuidados para você vir com o cabelo prontinho para a aplicação.",
  payment_confirmed_maintenance:
    "Sua manutenção está confirmada, {nome}! 💛 Aqui estão os cuidados para você vir com os dreads limpos e secos.",
  location: "Nosso endereço: {endereco}.{estacionamento} Localização no mapa: {mapa}",
  service_finished:
    "Ficamos muito felizes por ter você com a gente, {nome}! 💛 Aqui estão os cuidados para os seus dreads e quando fazer a próxima manutenção.",
  review: " Se puder, deixe uma avaliação no Google contando como foi seu atendimento: {avaliacao}",
} as const;

function withName(template: string, name: string | null): string {
  // Sem nome, tira o ", {nome}" em vez de imprimir "undefined" ou um nome inventado.
  return name ? template.replace("{nome}", name) : template.replace(", {nome}", "");
}

export async function planSystemEvent(
  event: Pick<StoredSystemEvent, "id" | "type">,
  data: TrustedEventData | null,
  deps: { secure: SecureUnitSettings },
): Promise<SystemPlan> {
  const base: SystemPlan = {
    eventId: event.id,
    eventType: event.type,
    conversationId: data?.conversationId ?? null,
    items: [],
    missing: [],
    skippedReason: null,
  };
  const skip = (reason: string, missing: MissingData[] = []): SystemPlan => ({ ...base, skippedReason: reason, missing });

  if (!data) return skip("trusted_data_unavailable");
  if (!data.conversationId) return skip("no_conversation", ["conversation"]);

  if (event.type === "PAYMENT_CONFIRMED") {
    // A confirmação só sai se o BANCO diz que o agendamento está confirmado.
    if (data.bookingStatus !== "CONFIRMED") return skip("booking_not_confirmed");
    // Sem saber se é aplicação ou manutenção, não escolhemos o card: a equipe decide.
    if (!data.appointmentType) return skip("appointment_type_unknown", ["appointment_type"]);

    const isApplication = data.appointmentType === "FIRST_APPLICATION";
    const items: SystemMessageItem[] = [
      {
        kind: "text",
        templateId: isApplication ? "payment_confirmed_application" : "payment_confirmed_maintenance",
        text: withName(
          isApplication ? TEMPLATES.payment_confirmed_application : TEMPLATES.payment_confirmed_maintenance,
          data.customerName,
        ),
      },
      { kind: "card", cardId: isApplication ? "cuidados-antes-dos-dreads" : "cuidados-antes-da-manutencao" },
    ];

    const missing: MissingData[] = [];
    const location = await deps.secure.getLocation(data.unitId);
    if (location) {
      const parking = data.unit?.parkingInfo ? ` ${data.unit.parkingInfo}` : "";
      items.push({
        kind: "location",
        templateId: "location",
        text: TEMPLATES.location
          .replace("{endereco}", location.address)
          .replace("{estacionamento}", parking)
          .replace("{mapa}", location.mapUrl),
        address: location.address,
        mapUrl: location.mapUrl,
      });
    } else {
      missing.push("location");
    }
    return { ...base, items, missing };
  }

  // SERVICE_FINISHED: só depois que a conversa realmente foi finalizada pela equipe.
  if (data.conversationMode !== "FINISHED") return skip("conversation_not_finished");

  const items: SystemMessageItem[] = [{ kind: "card", cardId: "cuidados-depois-dos-dreads" }];
  const missing: MissingData[] = [];
  if (data.appointmentType === "FIRST_APPLICATION") items.push({ kind: "card", cardId: "manutencao" });
  else if (data.appointmentType === null) missing.push("appointment_type");

  let text = withName(TEMPLATES.service_finished, data.customerName);
  if (data.unit?.reviewUrl) text += TEMPLATES.review.replace("{avaliacao}", data.unit.reviewUrl);
  else missing.push("review_url");
  items.push({ kind: "text", templateId: "service_finished", text });

  return { ...base, items, missing };
}

/** Remove endereço e mapa antes de guardar o plano. */
export function redactPlan(plan: SystemPlan): SystemPlan {
  return {
    ...plan,
    items: plan.items.map((item) =>
      item.kind === "location"
        ? { ...item, text: "[localização da unidade]", address: "[omitido]", mapUrl: "[omitido]" }
        : item,
    ),
  };
}

// ---------------------------------------------------------------------------
// Despacho (somente sombra nesta fase)
// ---------------------------------------------------------------------------

export interface SystemDispatcher {
  /** Entrega o plano. Deve ser idempotente por `plan.eventId`. */
  dispatch(plan: SystemPlan): Promise<"shadow_recorded">;
}

/** Sombra: não envia nada. O plano fica gravado no próprio SystemEvent. */
export class ShadowSystemDispatcher implements SystemDispatcher {
  async dispatch(): Promise<"shadow_recorded"> {
    return "shadow_recorded";
  }
}

export type ProcessDeps = {
  config: { mode: string };
  events: SystemEventStore;
  reader: SystemEventDataReader;
  secure: SecureUnitSettings;
  dispatcher: SystemDispatcher;
};

export type ProcessResult =
  | { status: "not_claimed" }
  | { status: "PROCESSED" | "SKIPPED" | "FAILED"; plan: SystemPlan | null; error: string | null };

function errorText(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.slice(0, 300);
}

/** Processa UM evento. Chamadas simultâneas: só uma consegue a reserva. */
export async function processSystemEvent(deps: ProcessDeps, eventId: string, now: Date = new Date()): Promise<ProcessResult> {
  assertShadowMode(deps.config);

  const event = await deps.events.claim(eventId, now, {
    maxAttempts: SYSTEM_EVENT_MAX_ATTEMPTS,
    leaseMs: SYSTEM_EVENT_LEASE_MS,
  });
  if (!event) return { status: "not_claimed" };

  try {
    const data = await deps.reader.load(event);
    const plan = await planSystemEvent(event, data, { secure: deps.secure });

    if (plan.skippedReason) {
      const stored = redactPlan(plan);
      await deps.events.finish(
        event.id,
        { status: "SKIPPED", plan: stored, missing: plan.missing, skippedReason: plan.skippedReason, error: null },
        now,
      );
      return { status: "SKIPPED", plan: stored, error: null };
    }

    await deps.dispatcher.dispatch(plan);
    const stored = redactPlan(plan);
    await deps.events.finish(
      event.id,
      { status: "PROCESSED", plan: stored, missing: plan.missing, skippedReason: null, error: null },
      now,
    );
    return { status: "PROCESSED", plan: stored, error: null };
  } catch (error) {
    const message = errorText(error);
    await deps.events.finish(event.id, { status: "FAILED", plan: null, missing: [], skippedReason: null, error: message }, now);
    return { status: "FAILED", plan: null, error: message };
  }
}
