"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID } from "@/lib/site";

type Fbq = (command: "init" | "track" | "trackCustom", name: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

// Dispara um evento do Pixel da Meta se o script já estiver carregado.
export function trackPixel(event: string, params?: Record<string, unknown>) {
  window.fbq?.("track", event, params);
}

// Links de WhatsApp do site (wa.me e o link curto do WhatsApp Business).
const WHATSAPP_LINK = 'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"], a[href*="wa.link"]';

// Pixel da Meta no site público: PageView em cada navegação e Contact em
// qualquer clique para o WhatsApp. Fica fora do painel (/admin).
export function MetaPixel() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const firstView = useRef(true);

  // O código base já registra o primeiro PageView; os seguintes vêm das
  // navegações do App Router, que não recarregam a página.
  useEffect(() => {
    if (isAdmin) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    trackPixel("PageView");
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.(WHATSAPP_LINK);
      if (link) trackPixel("Contact", { content_name: "WhatsApp", page: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

// Dispara um evento uma única vez quando a página abre (ex.: agendamento confirmado).
export function PixelEvent({ name, params }: { name: string; params?: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    // O script base carrega depois da hidratação; tenta por até 5 s.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (window.fbq) {
        trackPixel(name, params);
        sent.current = true;
        window.clearInterval(timer);
      } else if (tries > 25) {
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [name, params]);
  return null;
}
