import { test } from "node:test";
import assert from "node:assert/strict";
import { CLUBE_GRUPO_PADRAO, grupoAtual, linksDosGrupos } from "./clube";

test("sem variável, usa o grupo padrão", () => {
  assert.equal(grupoAtual(undefined), CLUBE_GRUPO_PADRAO);
  assert.equal(grupoAtual(""), CLUBE_GRUPO_PADRAO);
});

test("usa o primeiro link válido da lista", () => {
  const lista = " https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAA , https://chat.whatsapp.com/BBBBBBBBBBBBBBBBBBBBBB";
  assert.equal(grupoAtual(lista), "https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAA");
});

test("ignora links que não são convite de grupo do WhatsApp", () => {
  const lista = "https://evil.example.com/x, http://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAA, https://chat.whatsapp.com/CCCCCCCCCCCCCCCCCCCCCC";
  assert.deepEqual(linksDosGrupos(lista), ["https://chat.whatsapp.com/CCCCCCCCCCCCCCCCCCCCCC"]);
});
