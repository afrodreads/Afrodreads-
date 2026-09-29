import type { Metadata } from "next";
import Link from "next/link";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { GUIDES } from "@/lib/guides";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Guias sobre Dreadlocks e Microlocs | Afro Dreads Pirituba",
  description:
    "Respostas para as dúvidas mais comuns sobre dreadlocks e microlocs: quanto tempo leva, quanto custa e qual a diferença entre eles.",
  alternates: { canonical: "/guias" },
};

export default function GuiasPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd("Guias", "/guias")) }}
      />
      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4">
          <AdEyebrow>Guias</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Tire suas <em>dúvidas</em>
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Respostas rápidas sobre dreadlocks e microlocs, feitas pela equipe da Afro Dreads.
          </p>
        </div>
      </div>
      <section className="px-6 py-16 sm:py-24">
        <ul className="mx-auto m-0 grid max-w-6xl list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="flex h-full flex-col gap-3 rounded-ad-lg border border-line bg-surface-raised p-6 hover:border-line-strong"
              >
                <h2 className="m-0 font-serif text-3xl font-normal uppercase leading-none text-ink">{guide.h1}</h2>
                <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
