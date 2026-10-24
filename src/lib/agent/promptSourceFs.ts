import { readFile } from "node:fs/promises";
import type { PromptSource } from "./prompt";
import { promptSpecFrom } from "./promptVersion";

/**
 * Lê o prompt de um ou mais arquivos (caminhos informados pelo chamador; nada fixo aqui).
 * Vários arquivos viram um texto só, na ordem dada (ex.: V2 + camada comercial); o hash
 * da versão cobre todos.
 */
export function fileSystemPromptSource(paths: string | readonly string[]): PromptSource {
  const list = typeof paths === "string" ? [paths] : [...paths];
  return {
    load: async () => {
      const parts = await Promise.all(list.map((path) => readFile(path, "utf8")));
      return promptSpecFrom(parts.join("\n\n"), list.join(" + "));
    },
  };
}
