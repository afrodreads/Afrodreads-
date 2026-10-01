import type { ConversationMode, HandoffStatus } from "../conversations/types";

// Vocabulário de estados do V2 (`STATUS_CONVERSA`), DERIVADO dos dados reais.
// Não existe um campo "status do V2" para alguém esquecer de atualizar.
//
//   novo                    BOT, cliente acabou de chegar
//   em_atendimento          BOT, conversa em andamento com a IA
//   aguardando_humano         HUMAN com encaminhamento ainda não assumido
//   humano_atendendo          HUMAN com encaminhamento assumido (extensão do V2)
//   agendamento_confirmado  BOT e há agendamento confirmado à frente
//   finalizado              FINISHED, ou BOT reaberto depois de finalizado
//                           (o cliente voltou: não é cliente novo)

export type AgentStatus =
  | "novo"
  | "em_atendimento"
  | "aguardando_humano"
  | "humano_atendendo"
  | "agendamento_confirmado"
  | "finalizado";

export type StatusInput = {
  mode: ConversationMode;
  activeHandoffStatus: HandoffStatus | null;
  /** A última mudança de estado foi FINISHED → BOT (cliente voltou após o atendimento). */
  reopenedAfterFinished: boolean;
  hasUpcomingConfirmedBooking: boolean;
  /** Mensagens já enviadas ao cliente (IA, equipe ou sistema). */
  outboundMessageCount: number;
};

export function deriveAgentStatus(input: StatusInput): AgentStatus {
  if (input.mode === "FINISHED") return "finalizado";
  if (input.mode === "HUMAN") {
    return input.activeHandoffStatus === "CLAIMED" ? "humano_atendendo" : "aguardando_humano";
  }
  if (input.reopenedAfterFinished) return "finalizado";
  if (input.hasUpcomingConfirmedBooking) return "agendamento_confirmado";
  return input.outboundMessageCount === 0 ? "novo" : "em_atendimento";
}
