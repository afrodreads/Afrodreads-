import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { GUIDES, getGuideBySlug } from "@/lib/guides";
import { SERVICES } from "@/lib/services";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guias/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/guias/${guide.slug}`,
      siteName: "Afro Dreads",
      locale: "pt_BR",
      type: "article",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description, images: ["/og-image.png"] },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const showDurations = guide.slug === "quanto-tempo-leva-fazer-dreads";

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleJsonLd(guide),
            breadcrumbJsonLd(guide.h1, `/guias/${guide.slug}`, [{ name: "Guias", path: "/guias" }]),
          ]),
        }}
      />
      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <AdEyebrow>Guia</AdEyebrow>
          <AdTitle as="h1" size="hero">
            {guide.h1}
          </AdTitle>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">{guide.intro}</p>
        </div>
      </div>

      <article className="px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="m-0 font-serif text-3xl uppercase text-ink">{section.heading}</h2>
              {section.paragraphs.map((text) => (
                <p key={text} className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                  {text}
                </p>
              ))}
              {showDurations && section.heading === "Duração de cada serviço" && (
                <ul className="mt-4 flex list-none flex-col gap-2 p-0 text-[15px] text-ink-muted">
                  {SERVICES.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/servicos/${s.slug}`} className="text-ink underline underline-offset-4">
                        {s.name}
                      </Link>
                      : {s.minHours}h a {s.maxHours}h
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div>
            <AdButton href={buildWhatsAppLink("duvida")} icon={<WhatsAppIcon className="h-4 w-4" />}>
              {guide.ctaLabel}
            </AdButton>
          </div>
        </div>
      </article>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="m-0 mb-6 font-serif text-3xl uppercase text-ink">Outros guias</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/guias/${g.slug}`} className="text-ink underline underline-offset-4">
                  {g.h1}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] text-ink-muted">
            Veja também todos os{" "}
            <Link href="/servicos" className="text-ink underline underline-offset-4">
              serviços
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
