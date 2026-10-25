import { readFile } from "node:fs/promises";
import type { PromptSource } from "./prompt";
import { promptSpecFrom } from "./promptVersion";

/** Lê o prompt de um arquivo (caminho informado pelo chamador; nada fixo aqui). */
export function fileSystemPromptSource(path: string): PromptSource {
  return { load: async () => promptSpecFrom(await readFile(path, "utf8"), path) };
}
