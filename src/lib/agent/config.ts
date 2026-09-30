// Configuração do agente e da unidade. Nada da unidade (nome, endereço, links,
// horários, atendente) fica em código: vem de provedores de dados.

/**
 * Modo de operação. Nesta fase SÓ existe "shadow": o agente gera rascunhos e os
 * registra, e nenhuma mensagem chega ao cliente. Não há modo de envio real no tipo de
 * propósito: ligá-lo exige uma fase futura, com código novo e autorização.
 */
export type AgentMode = "shadow";

export type AgentConfig = { mode: AgentMode };

export class NotShadowModeError extends Error {
  constructor() {
    super("O agente só pode rodar em modo sombra nesta fase.");
    this.name = "NotShadowModeError";
  }
}

/** Guarda em tempo de execução (o TypeScript some depois do build). */
export function assertShadowMode(config: { mode: string }): asserts config is AgentConfig {
  if (config.mode !== "shadow") throw new NotShadowModeError();
}

/** Dados NÃO sensíveis da unidade que o agente pode usar. */
export type UnitAgentConfig = {
  unitId: string;
  /** Como a unidade se chama para o cliente (vem do cadastro). */
  displayName: string;
  /** Região pública (ex.: bairro). Antes da confirmação só isto é dito. */
  publicArea: string | null;
  /** Texto do horário do atendimento humano, exatamente como a equipe definiu. */
  humanHoursText: string | null;
  /** Nome da pessoa que assume os atendimentos. */
  humanName: string | null;
  /** Link de avaliação. Só é enviado por evento SYSTEM. */
  reviewUrl: string | null;
  /** Links que o agente pode citar (site, portfólio...). Qualquer outro é bloqueado. */
  allowedUrls: string[];
};

export interface UnitConfigProvider {
  get(unitId: string): Promise<UnitAgentConfig | null>;
}

/**
 * Dados SENSÍVEIS da unidade: endereço completo e link do mapa. Só o
 * despachante de eventos SYSTEM lê isto, depois de o agendamento estar
 * confirmado. O agente (modelo) NUNCA recebe esses valores.
 */
export type SecureLocation = { address: string; mapUrl: string };

export interface SecureUnitSettings {
  getLocation(unitId: string): Promise<SecureLocation | null>;
}
