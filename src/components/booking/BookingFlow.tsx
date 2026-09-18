"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { calculateDeposit } from "@/lib/pricing";
import { formatBRL } from "@/lib/format";

const STEPS = ["Serviço", "Data e horário", "Seus dados", "Resumo"] as const;

export function BookingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceSlug, setServiceSlug] = useState(SERVICES[0].slug);
  const [isOutOfTownSeason, setIsOutOfTownSeason] = useState(false);
  const [servicePrice, setServicePrice] = useState<number>(0);

  const [date, setDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const selectedService = SERVICES.find((s) => s.slug === serviceSlug)!;

  const depositPreview = useMemo(() => {
    if (!servicePrice || !selectedSlot) return null;
    return calculateDeposit({
      servicePrice,
      scheduledStart: new Date(selectedSlot),
      isOutOfTownSeason,
    });
  }, [servicePrice, selectedSlot, isOutOfTownSeason]);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/availability?service=${serviceSlug}&date=${date}`)
      .then((res) => res.json())
      .then((data) => setAvailableSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [date, serviceSlug]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug,
          scheduledStart: selectedSlot,
          servicePrice,
          isOutOfTownSeason,
          clientName,
          clientEmail,
          clientPhone,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? "Não foi possível agendar.");
        return;
      }
      router.push(`/checkout/${data.booking.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-32">
      <h1 className="font-display text-3xl uppercase text-brand-white sm:text-5xl">
        Agende seu horário
      </h1>

      <ol className="mt-8 flex gap-4 text-xs font-semibold uppercase tracking-wide text-brand-white/40">
        {STEPS.map((label, index) => (
          <li key={label} className={index <= step ? "text-brand-yellow" : ""}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl border border-white/10 bg-brand-gray p-6">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-white/80">
                Serviço
              </label>
              <select
                value={serviceSlug}
                onChange={(e) => setServiceSlug(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
              >
                {SERVICES.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.name} ({service.minHours}h–{service.maxHours}h)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-white/80">
                Valor combinado do serviço (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={servicePrice || ""}
                onChange={(e) => setServicePrice(Number(e.target.value))}
                placeholder="Valor combinado previamente com a Afro Dreads"
                className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white placeholder:text-brand-white/30"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-brand-white/80">
              <input
                type="checkbox"
                checked={isOutOfTownSeason}
                onChange={(e) => setIsOutOfTownSeason(e.target.checked)}
                className="h-4 w-4 accent-brand-yellow"
              />
              Atendimento por temporada, fora de São Paulo
            </label>

            <StepActions
              onNext={() => setStep(1)}
              nextDisabled={!servicePrice}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-white/80">Data</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
              />
            </div>

            {date && (
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-white/80">
                  Horário disponível
                </label>
                {loadingSlots && <p className="text-sm text-brand-white/50">Carregando horários...</p>}
                {!loadingSlots && availableSlots.length === 0 && (
                  <p className="text-sm text-brand-white/50">Sem horários disponíveis nesta data.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        selectedSlot === slot
                          ? "border-brand-yellow bg-brand-yellow text-brand-black"
                          : "border-white/20 text-brand-white/80 hover:border-brand-yellow"
                      }`}
                    >
                      {new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <StepActions
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              nextDisabled={!selectedSlot}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input label="Nome completo" value={clientName} onChange={setClientName} />
            <Input label="E-mail" type="email" value={clientEmail} onChange={setClientEmail} />
            <Input label="Telefone / WhatsApp" value={clientPhone} onChange={setClientPhone} />
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-white/80">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
              />
            </div>

            <StepActions
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!clientName || !clientEmail || !clientPhone}
            />
          </div>
        )}

        {step === 3 && depositPreview && (
          <div className="space-y-6">
            <SummaryRow label="Serviço" value={selectedService.name} />
            <SummaryRow
              label="Data e horário"
              value={new Date(selectedSlot!).toLocaleString("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
            <SummaryRow label="Valor do serviço" value={formatBRL(servicePrice)} />
            <SummaryRow
              label="Sinal a pagar agora"
              value={`${formatBRL(depositPreview.depositAmount)}${
                depositPreview.depositIsPercentage ? " (50%)" : ""
              }`}
              highlight
            />
            <SummaryRow label="Restante no dia" value={formatBRL(depositPreview.remainingAmount)} />

            <p className="rounded-lg bg-brand-black/60 p-4 text-xs text-brand-white/60">
              Cancelamentos com 2 dias ou mais de antecedência têm o sinal devolvido.
              Com 1 dia ou no mesmo dia do atendimento, o sinal não é reembolsado.
            </p>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <StepActions
              onBack={() => setStep(2)}
              onNext={handleSubmit}
              nextLabel={submitting ? "Enviando..." : "Confirmar e ir para pagamento"}
              nextDisabled={submitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepActions({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continuar",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex justify-between pt-2">
      {onBack ? (
        <button onClick={onBack} className="text-sm font-medium text-brand-white/60 hover:text-brand-white">
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-brand-yellow px-6 py-2 text-sm font-bold text-brand-black transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-white/80">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3">
      <span className="text-sm text-brand-white/60">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-brand-yellow" : "text-brand-white"}`}>
        {value}
      </span>
    </div>
  );
}
