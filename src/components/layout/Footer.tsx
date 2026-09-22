import Link from "next/link";
import { WhatsAppIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "@/components/icons/SocialIcons";
import { WHATSAPP_LINK } from "@/lib/contact";

const SOCIAL_LINKS = [
  { name: "WhatsApp", href: WHATSAPP_LINK, Icon: WhatsAppIcon },
  { name: "Instagram", href: "https://instagram.com/afrodreads_", Icon: InstagramIcon },
  { name: "TikTok", href: "https://tiktok.com/@afrodreads_", Icon: TikTokIcon },
  { name: "YouTube", href: "https://youtube.com/@afrodreadsofc", Icon: YouTubeIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-black py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 md:flex-row md:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-brand-yellow">AFRO DREADS</p>
          <p className="mt-2 max-w-xs text-sm text-brand-white/60">
            Estúdio especializado em dreadlocks e microlocs: formação, manutenção e revitalização.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-brand-white/70">
          <div className="flex flex-col gap-2">
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hover:text-brand-yellow">
              Agendar horário
            </a>
            <Link href="/portfolio" className="hover:text-brand-yellow">Portfólio</Link>
          </div>

          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={name}
                title={name}
                className="text-brand-white/70 transition-colors hover:text-brand-yellow"
              >
                <Icon className="h-6 w-6" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-brand-white/40">
        © {new Date().getFullYear()} Afro Dreads. Todos os direitos reservados.
      </p>
    </footer>
  );
}
