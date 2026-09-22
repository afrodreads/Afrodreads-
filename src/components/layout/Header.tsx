"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/agendamento", label: "Agendar" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        scrolled ? "bg-brand-black/90 backdrop-blur-sm shadow-lg shadow-black/40" : "bg-transparent"
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

        <Link
          href="/agendamento"
          className="hidden rounded-full bg-brand-yellow px-5 py-2 text-sm font-semibold text-brand-black transition-transform hover:scale-105 md:block"
        >
          Agendar horário
        </Link>
      </div>
    </header>
  );
}
