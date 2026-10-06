import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toWhatsappText } from "./format";

describe("formatação para WhatsApp", () => {
  it("troca **negrito** por *negrito*", () => {
    assert.equal(toWhatsappText("- **Pix:** aceitamos. **Microlocs:** 8 a 12 horas."), "- *Pix:* aceitamos. *Microlocs:* 8 a 12 horas.");
  });

  it("remove marcadores de título (#) no início da linha", () => {
    assert.equal(toWhatsappText("## Valores\nA Thay passa o orçamento."), "Valores\nA Thay passa o orçamento.");
  });

  it("não mexe em texto simples, emoji nem num # no meio da frase", () => {
    const text = "Oi, Lyon! Te espero no #dreadlife 💛";
    assert.equal(toWhatsappText(text), text);
  });

  it("não altera um asterisco simples (negrito do WhatsApp)", () => {
    assert.equal(toWhatsappText("Fica *muito* bonito."), "Fica *muito* bonito.");
  });

  it("troca dois-pontos no meio da frase por vírgula", () => {
    assert.equal(
      toWhatsappText("Pra iniciar seu atendimento, me fala: como você se chama?"),
      "Pra iniciar seu atendimento, me fala, como você se chama?",
    );
    assert.equal(
      toWhatsappText("Prazer, Lyon! 💛 Recebi as três fotos: na primeira eu vejo dreads."),
      "Prazer, Lyon! 💛 Recebi as três fotos, na primeira eu vejo dreads.",
    );
  });

  it("dois-pontos no fim da linha vira ponto", () => {
    assert.equal(toWhatsappText("Seguem os cuidados:\n- lavar com shampoo"), "Seguem os cuidados.\n- lavar com shampoo");
  });

  it("não mexe em links nem em horários", () => {
    const text = "Te espero às 10:30 💛 Avalie aqui https://g.page/r/abc/review";
    assert.equal(toWhatsappText(text), text);
  });

  it("reduz linhas em branco em excesso", () => {
    assert.equal(toWhatsappText("a\n\n\n\nb"), "a\n\nb");
  });
});
