// Envio assíncrono da resposta do agente pela API do ManyChat.
//
// Por que existe: a Solicitação externa do ManyChat espera no máximo 10 s. Respostas do
// agente que levavam mais (principalmente a passagem para a equipe) eram descartadas.
// Com o envio assíncrono, a rota responde na hora e, quando o texto fica pronto, este
// módulo grava a resposta nos campos do contato e dispara a automação de envio do
// ManyChat. Quem envia ao WhatsApp continua sendo o ManyChat.
//
// Único lugar do agente que fala com a rede do ManyChat (ver boundaries.test.ts).

const API = "https://api.manychat.com";

export type ManyChatSenderConfig = {
  /** Token da API do ManyChat (só do ambiente; nunca aparece em log). */
  token: string;
  /** Automação que envia agente_resposta / agente_resposta_2 e faz a passagem (flow_ns). */
  sendFlowNs: string;
};

export type AsyncReply = { reply: string; reply2: string; handoff: boolean };

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number }>;

export function manyChatSenderConfigFromEnv(env: Record<string, string | undefined> = process.env): ManyChatSenderConfig | null {
  const token = env.MANYCHAT_API_TOKEN?.trim();
  const sendFlowNs = env.AGENT_MANYCHAT_SEND_FLOW?.trim();
  if (!token || !sendFlowNs || !/^content\d+_\d+$/.test(sendFlowNs)) return null;
  return { token, sendFlowNs };
}

export class ManyChatSendError extends Error {
  constructor(readonly step: string, readonly status: number) {
    super(`ManyChat ${step} falhou (${status})`);
    this.name = "ManyChatSendError";
  }
}

/** Grava a resposta nos campos do contato e dispara a automação de envio. */
export function createManyChatSender(config: ManyChatSenderConfig, fetchImpl: FetchLike) {
  const post = async (step: string, pathname: string, body: unknown) => {
    const response = await fetchImpl(`${API}${pathname}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ManyChatSendError(step, response.status);
  };

  return async (contactId: string, message: AsyncReply): Promise<void> => {
    const subscriberId = Number(contactId);
    if (!Number.isSafeInteger(subscriberId)) throw new ManyChatSendError("contato", 0);
    const fields: [string, string][] = [
      ["agente_resposta", message.reply],
      ["agente_resposta_2", message.reply2],
      ["agente_handoff", message.handoff ? "sim" : "-"],
    ];
    for (const [fieldName, value] of fields) {
      await post("campo", "/fb/subscriber/setCustomFieldByName", {
        subscriber_id: subscriberId,
        field_name: fieldName,
        field_value: value,
      });
    }
    await post("envio", "/fb/sending/sendFlow", { subscriber_id: subscriberId, flow_ns: config.sendFlowNs });
  };
}
