"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { WHATSAPP_LINK } from "@/lib/contact";

const NAV_LINKS = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/#sobre", label: "Sobre" },
];

const MENU_LINKS = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#sobre", label: "Sobre nós" },
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
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        scrolled || menuOpen ? "bg-brand-black/90 backdrop-blur-sm shadow-lg shadow-black/40" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Afro Dreads — página inicial">
          <Image
            src="/images/logo-icon.png"
            alt="Afro Dreads"
            width={841}
            height={727}
            priority
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-white/90 transition-colors hover:text-brand-yellow"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 rounded-full bg-brand-yellow px-5 py-2 text-sm font-semibold text-brand-black transition-transform hover:scale-105 md:flex"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Agendar horário
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`block h-0.5 w-6 bg-brand-white transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-brand-white transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-brand-white transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-2 border-t border-white/10 bg-brand-black/95 px-6 py-6 md:hidden">
          {MENU_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-brand-white/90 transition-colors hover:bg-white/5 hover:text-brand-yellow"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-brand-yellow px-5 py-3 text-base font-bold text-brand-black transition-transform hover:scale-105"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Contato / Agendar
          </a>
        </nav>
      )}
    </header>
  );
}
