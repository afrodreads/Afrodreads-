import type { PaymentConfirmedEvent } from "./manualPayment";
import { assertShadowMode, type SecureUnitSettings, type UnitAgentConfig } from "./config";

// Eventos SYSTEM: mensagens que NÃO são resposta da IA.
//
// Pagamento confirmado → confirmação + card de cuidados + localização.
// Atendimento finalizado pela equipe → cuidados + manutenção + avaliação.
//
// Regras:
//  - texto vem de TEMPLATE FIXO (os do V2 §18/§19), nunca do modelo;
//  - os dados (status do agendamento, tipo de atendimento, endereço, mapa, link
//    de avaliação) vêm do backend/cofre da unidade, não do evento nem do modelo;
//  - se um dado necessário faltar, o item é OMITIDO e o plano avisa o que falta
//    (`missing`): nunca se inventa localização, link ou confirmação;
//  - NADA aqui altera a conversa: ela continua em HUMAN/FINISHED, conforme o
//    atendimento real. Não há dependência que permita mudar o modo.
//  - Nesta fase só existe o despachante de sombra, que registra o plano e não envia.

export type FinishedEvent = { type: "SERVICE_FINISHED"; eventId: string; conversationId: string };
export type SystemEvent = PaymentConfirmedEvent | FinishedEvent;

export type AppointmentType = "aplicacao_do_zero" | "manutencao";

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
  load(event: SystemEvent): Promise<TrustedEventData | null>;
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
  eventType: SystemEvent["type"];
  conversationId: string | null;
  items: SystemMessageItem[];
  /** Dados que faltaram: a equipe precisa agir ou completar o cadastro. */
  missing: MissingData[];
  /** Quando nada deve ser enviado, por quê. */
  skippedReason: string | null;
};

// Templates fixos. {nome} é o nome do cliente (vem do cadastro).
const TEMPLATES = {
  payment_confirmed_application:
    "Seu horário está confirmado, {nome}! 💛 Aqui estão os cuidados para você vir com o cabelo prontinho para a aplicação.",
  payment_confirmed_maintenance:
    "Sua manutenção está confirmada, {nome}! 💛 Aqui estão os cuidados para você vir com os dreads limpos e secos.",
  location: "Nosso endereço: {endereco}. Temos estacionamento no local. Localização no mapa: {mapa}",
  service_finished:
    "Ficamos muito felizes por ter você com a gente, {nome}! 💛 Aqui estão os cuidados para os seus dreads e quando fazer a próxima manutenção.",
  review: " Se puder, deixe uma avaliação contando como foi seu atendimento: {avaliacao}",
} as const;

function withName(template: string, name: string | null): string {
  // Sem nome, tira o ", {nome}" em vez de imprimir "undefined" ou um nome inventado.
  return name ? template.replace("{nome}", name) : template.replace(", {nome}", "");
}

export type PlannerDeps = { secure: SecureUnitSettings };

export async function planSystemEvent(
  event: SystemEvent,
  data: TrustedEventData | null,
  deps: PlannerDeps,
): Promise<SystemPlan> {
  const base: SystemPlan = {
    eventId: event.eventId,
    eventType: event.type,
    conversationId: data?.conversationId ?? null,
    items: [],
    missing: [],
    skippedReason: null,
  };
  const skip = (reason: string, missing: MissingData[] = []): SystemPlan => ({
    ...base,
    skippedReason: reason,
    missing,
  });

  if (!data) return skip("trusted_data_unavailable");
  if (!data.conversationId) return skip("no_conversation", ["conversation"]);

  if (event.type === "PAYMENT_CONFIRMED") {
    // A confirmação só sai se o BANCO diz que o agendamento está confirmado.
    if (data.bookingStatus !== "CONFIRMED") return skip("booking_not_confirmed");
    // Sem saber se é aplicação ou manutenção, não escolhemos o card: a equipe decide.
    if (!data.appointmentType) return skip("appointment_type_unknown", ["appointment_type"]);

    const isApplication = data.appointmentType === "aplicacao_do_zero";
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
      items.push({
        kind: "location",
        templateId: "location",
        text: TEMPLATES.location.replace("{endereco}", location.address).replace("{mapa}", location.mapUrl),
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

  if (data.appointmentType === "aplicacao_do_zero") items.push({ kind: "card", cardId: "manutencao" });
  else if (data.appointmentType === null) missing.push("appointment_type");

  let text = withName(TEMPLATES.service_finished, data.customerName);
  if (data.unit?.reviewUrl) text += TEMPLATES.review.replace("{avaliacao}", data.unit.reviewUrl);
  else missing.push("review_url");
  items.push({ kind: "text", templateId: "service_finished", text });

  return { ...base, items, missing };
}

// ---------------------------------------------------------------------------
// Despacho (somente sombra nesta fase)
// ---------------------------------------------------------------------------

export type DispatchOutcome = "recorded" | "duplicate" | "empty";

export interface SystemDispatcher {
  dispatch(plan: SystemPlan): Promise<DispatchOutcome>;
}

/** Registro do que o sistema TERIA enviado. Nada é enviado. */
export interface ShadowSystemSink {
  claim(eventId: string): Promise<boolean>;
  record(plan: SystemPlan): Promise<void>;
}

/** Remove o endereço e o mapa do plano antes de guardá-lo em sombra. */
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

export class ShadowSystemDispatcher implements SystemDispatcher {
  constructor(private readonly sink: ShadowSystemSink) {}

  async dispatch(plan: SystemPlan): Promise<DispatchOutcome> {
    // Idempotência por evento: o mesmo evento nunca vira dois registros.
    if (!(await this.sink.claim(plan.eventId))) return "duplicate";
    await this.sink.record(redactPlan(plan));
    return plan.items.length === 0 ? "empty" : "recorded";
  }
}

export type SystemRunDeps = {
  config: { mode: string };
  reader: SystemEventDataReader;
  secure: SecureUnitSettings;
  dispatcher: SystemDispatcher;
};

export type SystemRunResult = { plan: SystemPlan; outcome: DispatchOutcome };

/** Planeja e despacha um evento SYSTEM em modo sombra. Não toca na conversa. */
export async function runSystemEventShadow(deps: SystemRunDeps, event: SystemEvent): Promise<SystemRunResult> {
  assertShadowMode(deps.config);
  const data = await deps.reader.load(event);
  const plan = await planSystemEvent(event, data, { secure: deps.secure });
  const outcome = await deps.dispatcher.dispatch(plan);
  return { plan, outcome };
}
