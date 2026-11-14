import type { MouseEvent } from "react";

// Clique em qualquer chamada do Clube: dispara o "Lead" do Pixel da Meta (se o pixel
// estiver carregado) e só depois vai para /clube/entrar, que redireciona para o grupo.
export function entrarNoClube(e: MouseEvent<HTMLAnchorElement>, origem: string) {
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return; // sem pixel: segue o link normalmente
  e.preventDefault();
  fbq("track", "Lead", { content_name: "Clube Afro Dreads", origem });
  // Pequena espera para o evento sair antes de trocar de página.
  window.setTimeout(() => {
    // /clube/entrar é um route handler que redireciona para fora (WhatsApp), não uma
    // página: navegação completa é o comportamento certo, router.push não serve aqui.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/clube/entrar";
  }, 300);
}
