import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { audioExtension, createTranscriber, isAllowedMediaUrl, transcriberConfigFromEnv, type TranscriberConfig } from "./transcribe";

const CONFIG: TranscriberConfig = {
  enabled: true,
  provider: "openai",
  apiKey: "test-key",
  model: "gpt-transcribe",
  extraHosts: [],
  maxBytes: 1024,
  downloadTimeoutMs: 1000,
  transcribeTimeoutMs: 1000,
};
const AUDIO_URL = "https://manybot-files.s3.eu-central-1.amazonaws.com/abc/voice.ogg";

type Call = { url: string; init?: RequestInit };

function fakeFetch(download: Response | (() => Response), transcription: Response = Response.json({ text: "  quero fazer dreads  " })) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    if (url.startsWith("https://api.openai.com/") || url.startsWith("https://api.groq.com/")) return transcription;
    return typeof download === "function" ? download() : download;
  }) as typeof fetch;
  return { impl, calls };
}

const audio = (bytes = 10, type = "audio/ogg; codecs=opus") =>
  new Response(new Uint8Array(bytes), { headers: { "content-type": type, "content-length": String(bytes) } });

describe("transcrição: só arquivos permitidos", () => {
  it("aceita arquivos do ManyChat e hosts configurados; recusa o resto", () => {
    assert.equal(isAllowedMediaUrl(AUDIO_URL), true);
    assert.equal(isAllowedMediaUrl("https://manybot-files.s3.amazonaws.com/x.ogg"), true);
    assert.equal(isAllowedMediaUrl("http://manybot-files.s3.amazonaws.com/x.ogg"), false); // sem HTTPS
    assert.equal(isAllowedMediaUrl("https://evil.com/manybot-files.s3.amazonaws.com/x.ogg"), false);
    assert.equal(isAllowedMediaUrl("https://manybot-files.evil.com/x.ogg"), false);
    assert.equal(isAllowedMediaUrl("https://outro-bucket.s3.amazonaws.com/x.ogg"), false);
    assert.equal(isAllowedMediaUrl("https://user:pass@manybot-files.s3.amazonaws.com/x.ogg"), false);
    assert.equal(isAllowedMediaUrl("https://manybot-files.s3.amazonaws.com:8443/x.ogg"), false);
    assert.equal(isAllowedMediaUrl("https://169.254.169.254/latest"), false);
    assert.equal(isAllowedMediaUrl("não é link"), false);
    assert.equal(isAllowedMediaUrl("https://lookaside.fbsbx.com/a", ["lookaside.fbsbx.com"]), true);
  });

  it("reconhece áudio pelo tipo ou pela extensão; foto e vídeo não são áudio", () => {
    assert.equal(audioExtension("audio/ogg; codecs=opus", "/v"), "ogg");
    assert.equal(audioExtension("audio/mpeg", "/v"), "mp3");
    assert.equal(audioExtension("application/octet-stream", "/voice.opus"), "ogg");
    assert.equal(audioExtension("image/jpeg", "/foto.jpg"), null);
    assert.equal(audioExtension("video/mp4", "/video.mp4"), null);
    assert.equal(audioExtension("image/jpeg", "/truque.ogg"), null);
  });
});

describe("transcrição: fluxo", () => {
  it("desligada: não acessa a rede", async () => {
    const { impl, calls } = fakeFetch(audio());
    const result = await createTranscriber({ ...CONFIG, enabled: false }, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "failed", reason: "disabled" });
    assert.equal(calls.length, 0);
  });

  it("host não permitido: não acessa a rede", async () => {
    const { impl, calls } = fakeFetch(audio());
    const result = await createTranscriber(CONFIG, impl)("https://evil.com/a.ogg");
    assert.deepEqual(result, { kind: "failed", reason: "host_not_allowed" });
    assert.equal(calls.length, 0);
  });

  it("áudio: baixa sem seguir redirecionamento e transcreve em português com o vocabulário do salão", async () => {
    const { impl, calls } = fakeFetch(audio());
    const result = await createTranscriber(CONFIG, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "audio", text: "quero fazer dreads" });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].init?.redirect, "error");
    const form = calls[1].init?.body as FormData;
    assert.equal(form.get("model"), "gpt-transcribe");
    assert.deepEqual(form.getAll("languages[]"), ["pt"]);
    assert.equal(form.get("language"), null); // gpt-transcribe: nunca os dois campos
    assert.ok(form.getAll("keywords[]").includes("dreads"));
    for (const keyword of form.getAll("keywords[]")) assert.doesNotMatch(String(keyword), /[<>\r\n]/);
    assert.match(String(form.get("prompt")), /dreads/);
    assert.equal((form.get("file") as File).name, "audio.ogg");
    assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer test-key");
  });

  it("modelo principal recusa o arquivo (400): tenta uma vez com whisper-1", async () => {
    const calls: Call[] = [];
    let transcriptions = 0;
    const impl = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (!url.startsWith("https://api.openai.com/")) return audio();
      transcriptions += 1;
      return transcriptions === 1 ? new Response("formato", { status: 400 }) : Response.json({ text: "tenho dez centímetros" });
    }) as typeof fetch;
    const result = await createTranscriber({ ...CONFIG, model: "gpt-transcribe" }, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "audio", text: "tenho dez centímetros" });
    const fallback = calls[2].init?.body as FormData;
    assert.equal(fallback.get("model"), "whisper-1");
    assert.equal(fallback.get("language"), "pt");
    assert.equal(fallback.get("languages[]"), null);
  });

  it("foto: não chama a transcrição", async () => {
    const { impl, calls } = fakeFetch(new Response(new Uint8Array(10), { headers: { "content-type": "image/jpeg" } }));
    const result = await createTranscriber(CONFIG, impl)("https://manybot-files.s3.amazonaws.com/foto.jpg");
    assert.deepEqual(result, { kind: "other" });
    assert.equal(calls.length, 1);
  });

  it("arquivo grande demais: não transcreve", async () => {
    const { impl, calls } = fakeFetch(audio(2048));
    const result = await createTranscriber(CONFIG, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "failed", reason: "too_large" });
    assert.equal(calls.length, 1);
  });

  it("falhas viram 'failed' (nunca exceção)", async () => {
    const down = fakeFetch(() => {
      throw new Error("rede");
    });
    assert.deepEqual(await createTranscriber(CONFIG, down.impl)(AUDIO_URL), { kind: "failed", reason: "download" });

    const bad = fakeFetch(audio(), new Response("erro", { status: 500 }));
    assert.deepEqual(await createTranscriber(CONFIG, bad.impl)(AUDIO_URL), { kind: "failed", reason: "transcription" });

    const empty = fakeFetch(audio(), Response.json({ text: "   " }));
    assert.deepEqual(await createTranscriber(CONFIG, empty.impl)(AUDIO_URL), { kind: "failed", reason: "empty" });
  });
});

describe("transcrição: Groq (padrão, plano gratuito)", () => {
  it("escolhe o serviço e a chave pela configuração; sem chave fica desligada", () => {
    const groq = transcriberConfigFromEnv({ AGENT_TRANSCRIBE_ENABLED: "true", GROQ_API_KEY: "gsk_x" });
    assert.equal(groq.provider, "groq");
    assert.equal(groq.model, "whisper-large-v3");
    assert.equal(groq.enabled, true);
    // a chave da OpenAI não liga a Groq (e vice-versa)
    assert.equal(transcriberConfigFromEnv({ AGENT_TRANSCRIBE_ENABLED: "true", OPENAI_API_KEY: "sk-x" }).enabled, false);
    const openai = transcriberConfigFromEnv({ AGENT_TRANSCRIBE_ENABLED: "true", AGENT_TRANSCRIBE_PROVIDER: "openai", OPENAI_API_KEY: "sk-x" });
    assert.deepEqual([openai.provider, openai.model, openai.enabled], ["openai", "gpt-transcribe", true]);
    assert.equal(transcriberConfigFromEnv({ GROQ_API_KEY: "gsk_x" }).enabled, false); // precisa ligar explicitamente
  });

  it("manda o ogg para a Groq com whisper-large-v3, português e o vocabulário no prompt", async () => {
    const { impl, calls } = fakeFetch(audio());
    const result = await createTranscriber({ ...CONFIG, provider: "groq", model: "whisper-large-v3" }, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "audio", text: "quero fazer dreads" });
    assert.equal(calls[1].url, "https://api.groq.com/openai/v1/audio/transcriptions");
    const form = calls[1].init?.body as FormData;
    assert.equal(form.get("model"), "whisper-large-v3");
    assert.equal(form.get("language"), "pt");
    assert.equal(form.get("languages[]"), null);
    assert.match(String(form.get("prompt")), /Pirituba/);
    assert.equal((form.get("file") as File).name, "audio.ogg");
  });

  it("Groq recusando (400) não tenta outro modelo", async () => {
    const { impl, calls } = fakeFetch(audio(), new Response("erro", { status: 400 }));
    const result = await createTranscriber({ ...CONFIG, provider: "groq", model: "whisper-large-v3" }, impl)(AUDIO_URL);
    assert.deepEqual(result, { kind: "failed", reason: "transcription" });
    assert.equal(calls.length, 2);
  });
});
