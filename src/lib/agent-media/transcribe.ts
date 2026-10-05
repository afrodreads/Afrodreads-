// Transcrição de áudio do cliente (adaptador de rede isolado, como o do modelo).
//
// O ManyChat entrega só o LINK do arquivo. Aqui: confere se o link é de um host
// permitido (nunca um link qualquer), baixa com limite de tamanho e tempo, e manda
// para a API de transcrição. O áudio não é guardado em lugar nenhum; só o texto volta.
// Não registra logs com conteúdo, não conhece canais e não envia mensagens.

export type MediaResult =
  | { kind: "audio"; text: string }
  | { kind: "other" }
  | { kind: "failed"; reason: "disabled" | "host_not_allowed" | "too_large" | "download" | "transcription" | "empty" };

export type TranscriberConfig = {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  /** Hosts extras permitidos (exatos), além dos arquivos do ManyChat. */
  extraHosts: string[];
  maxBytes: number;
  downloadTimeoutMs: number;
  transcribeTimeoutMs: number;
};

const TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";

/** Palavras do salão: ajudam a transcrição a acertar termos que ela não conhece. */
export const VOCABULARY =
  "Afro Dreads, Thay, dreads, locs, twist, micro twist, tranças, crochê, entrelace, cabelo humano, sintético, " +
  "manutenção, retoque, raiz, mecha, quatro dedos, sinal, Pix, Pirituba, agendamento, orçamento.";

export function transcriberConfigFromEnv(env: Record<string, string | undefined> = process.env): TranscriberConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() || null;
  return {
    enabled: env.AGENT_TRANSCRIBE_ENABLED === "true" && apiKey !== null,
    apiKey,
    model: env.AGENT_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe",
    extraHosts: (env.AGENT_MEDIA_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
    // ~3 min de áudio de voz do WhatsApp (Opus) cabe com folga em 3 MB.
    maxBytes: 3 * 1024 * 1024,
    downloadTimeoutMs: 4000,
    transcribeTimeoutMs: 8000,
  };
}

/** Só HTTPS e só arquivos do ManyChat (manybot-files.*.amazonaws.com) ou hosts configurados. */
export function isAllowedMediaUrl(raw: string, extraHosts: readonly string[] = []): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host.startsWith("manybot-files.") && host.endsWith(".amazonaws.com")) return true;
  return extraHosts.includes(host);
}

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/amr": "amr",
};
const AUDIO_PATH = /\.(ogg|oga|opus|mp3|m4a|aac|wav|webm|amr)$/i;

/** Extensão do arquivo de áudio, pelo tipo informado ou pelo nome. null = não é áudio. */
export function audioExtension(contentType: string | null, pathname: string): string | null {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (AUDIO_EXTENSIONS[type]) return AUDIO_EXTENSIONS[type];
  if (type.startsWith("audio/")) return "ogg";
  const match = AUDIO_PATH.exec(pathname);
  if (match && (type === "" || type === "application/octet-stream" || type === "binary/octet-stream")) {
    const ext = match[1].toLowerCase();
    return ext === "oga" || ext === "opus" ? "ogg" : ext === "aac" ? "m4a" : ext;
  }
  return null;
}

type Fetch = typeof fetch;

export function createTranscriber(config: TranscriberConfig, fetchImpl: Fetch = fetch): (url: string) => Promise<MediaResult> {
  return async (rawUrl) => {
    if (!config.enabled || !config.apiKey) return { kind: "failed", reason: "disabled" };
    if (!isAllowedMediaUrl(rawUrl, config.extraHosts)) return { kind: "failed", reason: "host_not_allowed" };
    const url = new URL(rawUrl);

    // 1) Baixa o arquivo (sem seguir redirecionamentos: o host conferido é o host baixado).
    let bytes: ArrayBuffer;
    let ext: string | null;
    try {
      const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(config.downloadTimeoutMs) });
      if (!response.ok) return { kind: "failed", reason: "download" };
      ext = audioExtension(response.headers.get("content-type"), url.pathname);
      if (!ext) return { kind: "other" };
      const declared = Number(response.headers.get("content-length") ?? "0");
      if (declared > config.maxBytes) return { kind: "failed", reason: "too_large" };
      bytes = await response.arrayBuffer();
      if (bytes.byteLength > config.maxBytes) return { kind: "failed", reason: "too_large" };
    } catch {
      return { kind: "failed", reason: "download" };
    }

    // 2) Transcreve (português, com o vocabulário do salão).
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes]), `audio.${ext}`);
      form.append("model", config.model);
      form.append("language", "pt");
      form.append("prompt", VOCABULARY);
      form.append("response_format", "json");
      const response = await fetchImpl(TRANSCRIPTION_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(config.transcribeTimeoutMs),
      });
      if (!response.ok) return { kind: "failed", reason: "transcription" };
      const json = (await response.json()) as { text?: unknown };
      const text = typeof json.text === "string" ? json.text.replace(/\s+/g, " ").trim() : "";
      return text ? { kind: "audio", text } : { kind: "failed", reason: "empty" };
    } catch {
      return { kind: "failed", reason: "transcription" };
    }
  };
}
