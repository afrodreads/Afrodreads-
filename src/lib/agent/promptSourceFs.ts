import { readFile } from "node:fs/promises";
import type { PromptSource } from "./prompt";

/** Lê o V2 de um arquivo (caminho informado pelo chamador; nada fixo aqui). */
export function fileSystemPromptSource(path: string): PromptSource {
  return { load: () => readFile(path, "utf8") };
}
