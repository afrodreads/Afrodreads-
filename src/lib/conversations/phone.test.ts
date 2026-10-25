import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { maskPhone, normalizePhone } from "./phone";

describe("normalizePhone: celulares brasileiros", () => {
  const canonical = "+5511987654321";
  for (const raw of [
    "11987654321",
    "(11) 98765-4321",
    "11 98765 4321",
    "011 98765-4321",
    "+55 11 98765-4321",
    "+5511987654321",
    "5511987654321",
    "55 (11) 98765-4321",
    "0055 11 98765-4321",
    "  11.98765.4321  ",
  ]) {
    it(`"${raw}" vira ${canonical}`, () => {
      assert.equal(normalizePhone(raw), canonical);
    });
  }

  it("celular antigo sem o nono dígito recebe o 9 (mesmo aparelho, mesmo cliente)", () => {
    assert.equal(normalizePhone("11 8765-4321"), "+5511987654321");
    assert.equal(normalizePhone("+55 11 8765-4321"), "+5511987654321");
    assert.equal(normalizePhone("551187654321"), "+5511987654321");
  });

  it("o DDD 55 (Rio Grande do Sul) não é confundido com o código do país", () => {
    assert.equal(normalizePhone("55 99999-9999"), "+5555999999999");
    assert.equal(normalizePhone("5555999999999"), "+5555999999999");
    assert.equal(normalizePhone("+55 55 99999-9999"), "+5555999999999");
  });
});

describe("normalizePhone: fixos e internacionais", () => {
  it("telefone fixo de 8 dígitos mantém os 8 dígitos", () => {
    assert.equal(normalizePhone("(11) 3456-7890"), "+551134567890");
    assert.equal(normalizePhone("+55 11 3456-7890"), "+551134567890");
  });

  it("número de outro país vira E.164 genérico", () => {
    assert.equal(normalizePhone("+1 415 555 2671"), "+14155552671");
    assert.equal(normalizePhone("0044 20 7946 0958"), "+442079460958");
  });
});

describe("normalizePhone: entradas inválidas", () => {
  for (const raw of [
    "",
    "   ",
    "abc",
    "123",
    "11 1234-5678", // fixo começando em 1
    "11 88888-8888", // 9 dígitos que não começam em 9
    "9 8765-4321", // sem DDD
    "10 98765-4321", // DDD terminando em 0
    "+55 11 9876", // curto
    "+55 11 98765-43210", // longo
    "11987654321 ramal 2",
    "++5511987654321",
    "11+987654321",
    "+0 123456789",
  ]) {
    it(`recusa "${raw}"`, () => {
      assert.equal(normalizePhone(raw), null);
    });
  }

  it("recusa o que não é texto", () => {
    assert.equal(normalizePhone(undefined), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone(11987654321), null);
  });
});

describe("normalizePhone: propriedades", () => {
  it("é idempotente (normalizar de novo não muda nada)", () => {
    for (const raw of ["(11) 98765-4321", "+1 415 555 2671", "11 3456-7890"]) {
      const once = normalizePhone(raw);
      assert.ok(once);
      assert.equal(normalizePhone(once), once);
    }
  });

  it("formatos diferentes do mesmo número dão o mesmo resultado", () => {
    const variants = ["11987654321", "(11) 9 8765-4321", "+55 11 98765-4321", "011 987654321", "5511987654321"];
    assert.equal(new Set(variants.map(normalizePhone)).size, 1);
  });
});

describe("maskPhone", () => {
  it("esconde o meio do número", () => {
    assert.equal(maskPhone("+5511987654321"), "+55…4321");
  });

  it("números curtos viram ***", () => {
    assert.equal(maskPhone("123"), "***");
  });
});
