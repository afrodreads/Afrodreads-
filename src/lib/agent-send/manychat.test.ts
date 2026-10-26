import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createManyChatSender, manyChatSenderConfigFromEnv, ManyChatSendError, type FetchLike } from "./manychat";

const config = { token: "tkn-de-teste", sendFlowNs: "content20261024230000_123456" };

function recorder(status = 200) {
  const calls: { url: string; body: Record<string, unknown>; auth: string }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
    return { ok: status < 300, status };
  };
  return { calls, fetchImpl };
}

describe("envio assíncrono pelo ManyChat", () => {
  it("grava os três campos e dispara a automação de envio, nessa ordem", async () => {
    const { calls, fetchImpl } = recorder();
    await createManyChatSender(config, fetchImpl)("1453473616", { reply: "Oi! 💛", reply2: "-", handoff: true });

    assert.deepEqual(
      calls.map((c) => c.url),
      [
        "https://api.manychat.com/fb/subscriber/setCustomFieldByName",
        "https://api.manychat.com/fb/subscriber/setCustomFieldByName",
        "https://api.manychat.com/fb/subscriber/setCustomFieldByName",
        "https://api.manychat.com/fb/sending/sendFlow",
      ],
    );
    assert.deepEqual(calls[0].body, { subscriber_id: 1453473616, field_name: "agente_resposta", field_value: "Oi! 💛" });
    assert.deepEqual(calls[2].body, { subscriber_id: 1453473616, field_name: "agente_handoff", field_value: "sim" });
    assert.deepEqual(calls[3].body, { subscriber_id: 1453473616, flow_ns: config.sendFlowNs });
    assert.ok(calls.every((c) => c.auth === "Bearer tkn-de-teste"));
  });

  it("falha do ManyChat vira erro (para a rota não marcar como respondido)", async () => {
    const { fetchImpl } = recorder(400);
    await assert.rejects(createManyChatSender(config, fetchImpl)("123", { reply: "a", reply2: "-", handoff: false }), ManyChatSendError);
  });

  it("contato com id inválido não chama a API", async () => {
    const { calls, fetchImpl } = recorder();
    await assert.rejects(createManyChatSender(config, fetchImpl)("abc", { reply: "a", reply2: "-", handoff: false }));
    assert.equal(calls.length, 0);
  });

  it("só liga com token e automação válidos", () => {
    assert.equal(manyChatSenderConfigFromEnv({}), null);
    assert.equal(manyChatSenderConfigFromEnv({ MANYCHAT_API_TOKEN: "x" }), null);
    assert.equal(manyChatSenderConfigFromEnv({ MANYCHAT_API_TOKEN: "x", AGENT_MANYCHAT_SEND_FLOW: "qualquer" }), null);
    assert.deepEqual(manyChatSenderConfigFromEnv({ MANYCHAT_API_TOKEN: " x ", AGENT_MANYCHAT_SEND_FLOW: config.sendFlowNs }), {
      token: "x",
      sendFlowNs: config.sendFlowNs,
    });
  });
});
