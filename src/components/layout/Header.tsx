"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/servicos", label: "Serviços" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed top-0 z-50 w-full font-sans transition-colors duration-300 ${
        scrolled || menuOpen ? "border-b border-line bg-surface/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="shrink-0" aria-label="Afro Dreads — página inicial">
          <Image
            src="/images/logo-icon.png"
            alt="Afro Dreads"
            width={841}
            height={727}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>

        <nav className="hidden gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-ad-pill px-3.5 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href={buildWhatsAppLink("geral")}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 rounded-ad-pill bg-amarelo px-5 py-2 text-sm font-bold uppercase tracking-wide text-amarelo-on transition-transform hover:scale-105 md:flex"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Quero ficar no estilo
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`block h-0.5 w-6 bg-ink transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-ink transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-2 border-t border-line bg-surface/95 px-6 py-6 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-ad-md px-3 py-3 text-base font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={buildWhatsAppLink("geral")}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-ad-pill bg-amarelo px-5 py-3 text-base font-bold uppercase tracking-wide text-amarelo-on transition-transform hover:scale-105"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Contato / Agendar
          </a>
        </nav>
      )}
    </header>
  );
}
