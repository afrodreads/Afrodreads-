import Image from "next/image";
import Link from "next/link";
import { WhatsAppIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const PAGE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/servicos", label: "Serviços" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/contato", label: "Contato" },
];

const SOCIAL_LINKS = [
  { name: "Instagram", href: "https://instagram.com/afrodreads_", Icon: InstagramIcon },
  { name: "TikTok", href: "https://tiktok.com/@afrodreads_", Icon: TikTokIcon },
  { name: "YouTube", href: "https://youtube.com/@afrodreadsofc", Icon: YouTubeIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-16 font-sans">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-3">
            <Image src="/images/logo-icon.png" alt="Afro Dreads" width={64} height={55} className="h-14 w-auto" />
            <p className="m-0 max-w-xs text-[15px] leading-relaxed text-ink-muted">
              Seu estilo. Sua identidade. Do seu jeito. 💛
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amarelo">
              Páginas
            </h4>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {PAGE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-muted hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amarelo">
              Fale com a gente
            </h4>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              <li>
                <a href={buildWhatsAppLink("geral")} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-ink">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/afrodreads_" target="_blank" rel="noreferrer" className="text-ink-muted hover:text-ink">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://share.google/hdE6lHpW06wTsRZvc" target="_blank" rel="noreferrer" className="text-ink-muted hover:text-ink">
                  Pirituba · SP
                </a>
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-4">
              {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  title={name}
                  className="text-ink-muted transition-colors hover:text-amarelo"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-[13px] text-ink-muted">
          <span>© {new Date().getFullYear()} Afro Dreads</span>
          <span>Vem ficar no estilo com a gente. 💛</span>
        </div>
      </div>
    </footer>
  );
}
