"use client";

import { useState } from "react";

// Caixa do painel com o link privado para assinar a agenda no Google Agenda.
export function GoogleCalendarSubscribe({ feedUrl }: { feedUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!feedUrl) {
    return (
      <p className="mb-6 text-xs text-brand-white/50">
        Google Agenda indisponível: falta configurar ADMIN_SESSION_SECRET no servidor.
      </p>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-brand-gray p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-white">
          📅 <span className="font-semibold">Google Agenda</span>
          <span className="text-brand-white/60"> · os agendamentos confirmados aparecem sozinhos na sua agenda</span>
        </p>
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-brand-yellow/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-yellow hover:bg-brand-yellow/10"
        >
          {open ? "Fechar" : "Conectar"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 text-sm text-brand-white/80">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              No computador, abra o{" "}
              <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noreferrer" className="text-brand-yellow underline">
                Google Agenda → Adicionar agenda → Do URL
              </a>
              .
            </li>
            <li>Cole o link abaixo e clique em &quot;Adicionar agenda&quot;. Pronto: a agenda &quot;Afro Dreads - Agendamentos&quot; aparece no celular também.</li>
            <li>O Google atualiza a cada algumas horas. Para colocar um agendamento na hora, use o botão &quot;Google Agenda&quot; do agendamento.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={feedUrl} className="min-w-0 flex-1 rounded-lg border border-white/20 bg-brand-black px-3 py-2 text-xs text-brand-white" onFocus={(e) => e.target.select()} />
            <button
              onClick={() => navigator.clipboard.writeText(feedUrl).then(() => setCopied(true))}
              className="rounded-full bg-brand-yellow px-4 py-2 text-xs font-bold text-brand-black"
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <p className="text-xs text-amber-200/80">
            Este link é privado (tem nome e WhatsApp dos clientes). Não compartilhe fora da equipe.
          </p>
        </div>
      )}
    </div>
  );
}
