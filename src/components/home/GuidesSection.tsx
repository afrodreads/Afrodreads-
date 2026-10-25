import Link from "next/link";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { GUIDES } from "@/lib/guides";

// Liga a home (a página mais forte do site) aos guias, ao "Sobre" e ao "Como
// agendar", para o Google descobrir e dar prioridade a essas páginas.
export function GuidesSection() {
  return (
    <section className="bg-surface-sunken px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col items-start gap-4">
            <AdEyebrow>Guias</AdEyebrow>
            <AdTitle>
              Tire suas <em>dúvidas</em>
            </AdTitle>
          </div>
          <AdButton href="/guias" variant="outline">
            Todos os guias →
          </AdButton>
        </div>

        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="flex h-full flex-col gap-3 rounded-ad-lg border border-line bg-surface-raised p-6 hover:border-line-strong"
              >
                <h3 className="m-0 font-serif text-2xl font-normal uppercase leading-none text-ink">{guide.h1}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[15px] leading-relaxed text-ink-muted">
          Quer saber quem faz a Afro Dreads?{" "}
          <Link href="/sobre" className="text-ink underline underline-offset-4">
            Conheça Lyon e Thay
          </Link>
          . Já decidiu? Veja{" "}
          <Link href="/como-agendar" className="text-ink underline underline-offset-4">
            como agendar
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
