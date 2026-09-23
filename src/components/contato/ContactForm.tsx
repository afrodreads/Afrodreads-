"use client";

import { useState } from "react";
import { SERVICES } from "@/lib/services";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppFormLink } from "@/lib/whatsapp";

const TAMANHOS = ["Ainda não sei", "Curto", "Médio", "Longo"];
const ESPESSURAS = ["Ainda não sei", "Fino / delicado", "Médio", "Grosso / marcante"];

export function ContactForm() {
  const [nome, setNome] = useState("");
  const [servico, setServico] = useState("");
  const [cor, setCor] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [espessura, setEspessura] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Conta pra gente o seu nome antes de enviar.");
      return;
    }
    setError(null);
    const url = buildWhatsAppFormLink({
      nome: nome.trim(),
      servico: servico || undefined,
      cor: cor.trim() || undefined,
      tamanho: tamanho && tamanho !== "Ainda não sei" ? tamanho : undefined,
      espessura: espessura && espessura !== "Ainda não sei" ? espessura : undefined,
      mensagem: mensagem.trim() || undefined,
    });
    setSentUrl(url);
    window.open(url, "_blank", "noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-ad-lg border border-line bg-surface-raised p-6 sm:p-8"
    >
      <h2 className="m-0 font-serif text-4xl font-normal uppercase leading-none tracking-tight text-ink">
        Monte seu <em className="italic text-amarelo-text">projeto</em>
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-muted">
        Responda rapidinho e a sua mensagem chega pronta no nosso WhatsApp. Depois é só mandar as fotos
        do seu cabelo na conversa.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Seu nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="ad-input" />
        </Field>
        <Field label="Serviço">
          <select value={servico} onChange={(e) => setServico(e.target.value)} className="ad-input">
            <option value="">Ainda não sei</option>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cor">
          <input
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            placeholder="Ex.: natural, loiro, roxo"
            className="ad-input"
          />
        </Field>
        <Field label="Tamanho">
          <select value={tamanho} onChange={(e) => setTamanho(e.target.value)} className="ad-input">
            {TAMANHOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Espessura">
        <select value={espessura} onChange={(e) => setEspessura(e.target.value)} className="ad-input">
          {ESPESSURAS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </Field>

      <Field label="Conte sua ideia" hint="(opcional)">
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={3}
          placeholder="Ex.: quero microlocs loiros até o ombro, nunca fiz dreads."
          className="ad-input resize-y"
        />
      </Field>

      {error && <p className="m-0 text-sm text-marrom-text">{error}</p>}

      <AdButton type="submit" size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
        Enviar no WhatsApp
      </AdButton>

      {sentUrl && (
        <div className="rounded-ad-md border border-folha bg-folha-soft p-4 text-[15px] leading-relaxed text-folha">
          Sua mensagem está pronta.{" "}
          <a href={sentUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
            Abrir o WhatsApp ↗
          </a>
        </div>
      )}
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {label} {hint && <span className="font-normal text-ink-muted">{hint}</span>}
      {children}
    </label>
  );
}
