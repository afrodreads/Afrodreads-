import { createHash } from "node:crypto";

// Versão identificável do prompt: NOME declarado no arquivo (ex.: "V2") + HASH
// SHA-256 do conteúdo. O hash é calculado sobre o texto normalizado (sem BOM,
// quebras de linha como LF), então o mesmo prompt tem o mesmo hash no Windows
// (CRLF) e no Linux/Vercel (LF). Qualquer mudança real de texto muda o hash.
//
// Cada AgentRun aponta para uma PromptVersion; assim V2 → V3 → V4 ficam
// comparáveis mesmo que o arquivo seja renomeado ou editado.

export type PromptSpec = {
  /** Nome declarado no título do arquivo (ex.: "V2"), ou "sem-versao". */
  name: string;
  sha256: string;
  /** Conteúdo normalizado (é ele que vai para o modelo e para o banco). */
  content: string;
  /** Caminho de onde foi lido (só para referência humana). */
  sourcePath: string;
};

export function normalizePromptContent(raw: string): string {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export function promptSha256(raw: string): string {
  return createHash("sha256").update(normalizePromptContent(raw), "utf8").digest("hex");
}

/** "# PROMPT DO AGENTE ... V2" → "V2". */
export function promptName(content: string): string {
  const title = normalizePromptContent(content).split("\n").find((line) => line.startsWith("# ")) ?? "";
  const match = /\bV(\d+)\b/i.exec(title);
  return match ? `V${match[1]}` : "sem-versao";
}

export function promptSpecFrom(raw: string, sourcePath: string): PromptSpec {
  const content = normalizePromptContent(raw);
  return { name: promptName(content), sha256: promptSha256(content), content, sourcePath };
}

export function shortSha(sha256: string): string {
  return sha256.slice(0, 12);
}

/** Registra (ou reencontra) a versão pelo hash e devolve o id dela. */
export interface PromptRegistry {
  ensure(spec: PromptSpec): Promise<string>;
}
