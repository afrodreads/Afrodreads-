import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/orcamentos", label: "Orçamentos" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/bloqueios", label: "Travar horários" },
  { href: "/admin/agente", label: "Agente (sombra)" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold uppercase tracking-wide text-brand-white/70">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-brand-yellow">
              {link.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
