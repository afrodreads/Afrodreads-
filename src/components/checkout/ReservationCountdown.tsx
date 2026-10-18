"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Contador da reserva: o horário fica segurado até o fim do prazo de pagamento.
// Usa o relógio do servidor (diferença calculada uma vez) para não depender do
// relógio do celular do cliente.
export function ReservationCountdown({ deadline, serverNow }: { deadline: string; serverNow: string }) {
  const router = useRouter();
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadline).getTime() - new Date(serverNow).getTime());

  useEffect(() => {
    const deadlineMs = new Date(deadline).getTime();
    const tick = () => setRemainingMs(deadlineMs - (Date.now() + offset));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, offset]);

  const expired = remainingMs <= 0;
  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const urgent = totalSeconds <= 10 * 60;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={expired ? "Tempo de reserva encerrado" : `Horário reservado por mais ${minutes} minutos`}
      className={`sticky top-20 z-40 rounded-2xl border px-4 py-3 text-center shadow-lg backdrop-blur ${
        urgent ? "border-red-400/60 bg-red-500/15" : "border-brand-yellow/50 bg-brand-black/90"
      }`}
    >
      {expired ? (
        <p className="text-sm font-semibold text-brand-white">O tempo de reserva terminou.</p>
      ) : (
        <p className="text-sm text-brand-white">
          ⏳ Seu horário está reservado por{" "}
          <span className={`font-display text-xl tabular-nums ${urgent ? "text-red-300" : "text-brand-yellow"}`}>{clock}</span>
          <span className="block text-xs text-brand-white/60 sm:inline sm:pl-2">Pague agora para garantir a vaga.</span>
        </p>
      )}
    </div>
  );
}
