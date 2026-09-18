import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/bloqueios", label: "Bloqueios" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <nav className="flex gap-6 text-sm font-semibold uppercase tracking-wide text-brand-white/70">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-yellow">
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
