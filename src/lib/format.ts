export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

// Fixa o fuso de São Paulo explicitamente: em componentes de servidor o
// runtime (ex.: Vercel) roda em UTC, então sem isso a hora exibida diverge
// do horário real do estúdio.
export function formatDateTimeBR(date: Date): string {
  return date.toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  });
}

export function formatTimeBR(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SAO_PAULO_TIME_ZONE,
  });
}

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    dateStyle: "long",
    timeZone: SAO_PAULO_TIME_ZONE,
  });
}
