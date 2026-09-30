import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseToolCall, TOOL_DEFINITIONS, TOOL_NAMES } from "./tools";

describe("ferramentas do agente: só propostas, nada financeiro", () => {
  it("existem apenas duas ferramentas", () => {
    assert.deepEqual([...TOOL_NAMES], ["request_handoff", "update_lead_data"]);
    assert.deepEqual(
      TOOL_DEFINITIONS.map((tool) => tool.name),
      [...TOOL_NAMES],
    );
  });

  it("nenhuma ferramenta (nome ou descrição) toca em pagamento, agenda, preço ou envio", () => {
    const text = TOOL_DEFINITIONS.map((tool) => `${tool.name} ${tool.description}`).join(" ").toLowerCase();
    for (const word of ["pagamento", "estorno", "refund", "cancel", "agenda", "pre[cç]o", "extend", "confirm", "send", "enviar mensagem"]) {
      assert.doesNotMatch(text, new RegExp(word), word);
    }
  });

  it("pedidos de ações financeiras ou de agenda são descartados como ferramenta desconhecida", () => {
    for (const name of [
      "confirm_payment",
      "confirm_manual_payment",
      "extend_payment_deadline",
      "refund_payment",
      "cancel_booking",
      "create_booking",
      "reschedule_booking",
      "send_message",
      "send_card",
      "send_location",
      "quote_price",
      "check_availability",
    ]) {
      assert.deepEqual(parseToolCall({ name, arguments: {} }), { ok: false, reason: "unknown_tool", name });
    }
  });

  it("request_handoff aceita motivo válido e resumo estruturado", () => {
    const result = parseToolCall({
      name: "request_handoff",
      arguments: { reason: "QUOTE_REQUEST", summary: { headline: "Quer orçamento", collected: { metodo: "microlocs" } } },
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.action.tool, "request_handoff");
  });

  it("request_handoff recusa motivo inventado e resumo com campos extras", () => {
    assert.equal(
      parseToolCall({ name: "request_handoff", arguments: { reason: "INVENTADO", summary: { headline: "x" } } }).ok,
      false,
    );
    assert.equal(
      parseToolCall({ name: "request_handoff", arguments: { reason: "OTHER", summary: { headline: "x", cpf: "1" } } }).ok,
      false,
    );
  });

  it("update_lead_data aceita campos do CRM e recusa qualquer campo de preço/pagamento", () => {
    assert.equal(
      parseToolCall({ name: "update_lead_data", arguments: { intent: "ORCAMENTO", temperature: "QUENTE", material: "sintetico" } }).ok,
      true,
    );
    for (const extra of [{ price: 400 }, { paymentConfirmed: true }, { bookingStatus: "CONFIRMED" }]) {
      assert.equal(parseToolCall({ name: "update_lead_data", arguments: extra }).ok, false);
    }
    assert.equal(parseToolCall({ name: "update_lead_data", arguments: { intent: "INVENTADA" } }).ok, false);
  });
});
