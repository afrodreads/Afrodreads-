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

  it("reduz linhas em branco em excesso", () => {
    assert.equal(toWhatsappText("a\n\n\n\nb"), "a\n\nb");
  });
});
