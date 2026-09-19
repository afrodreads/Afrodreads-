import Link from "next/link";

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

        <div className="flex flex-col gap-2 text-sm text-brand-white/70">
          <Link href="/agendamento" className="hover:text-brand-yellow">Agendar horário</Link>
          <Link href="/portfolio" className="hover:text-brand-yellow">Portfólio</Link>
          <a
            href="https://wa.me/message/WFY4THHQSOITF1"
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-yellow"
          >
            WhatsApp
          </a>
          <a
            href="https://instagram.com/afrodreads_"
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-yellow"
          >
            Instagram
          </a>
          <a
            href="https://tiktok.com/@afrodreads_"
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-yellow"
          >
            TikTok
          </a>
          <a
            href="https://youtube.com/@afrodreadsofc"
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-yellow"
          >
            YouTube
          </a>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-brand-white/40">
        © {new Date().getFullYear()} Afro Dreads. Todos os direitos reservados.
      </p>
    </footer>
  );
}
