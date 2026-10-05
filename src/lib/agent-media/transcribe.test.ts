import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { audioExtension, createTranscriber, isAllowedMediaUrl, type TranscriberConfig } from "./transcribe";

const CONFIG: TranscriberConfig = {
  enabled: true,
  apiKey: "test-key",
  model: "gpt-4o-mini-transcribe",
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
    if (url.startsWith("https://api.openai.com/")) return transcription;
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
    assert.equal(form.get("language"), "pt");
    assert.equal(form.get("model"), "gpt-4o-mini-transcribe");
    assert.match(String(form.get("prompt")), /dreads/);
    assert.equal((form.get("file") as File).name, "audio.ogg");
    assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer test-key");
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
