import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { AdTag } from "@/components/ui/Tag";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { SERVICES, getServiceBySlug } from "@/lib/services";
import { SERVICE_DETAILS } from "@/lib/serviceDetails";
import { serviceJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  const title = `${service.name} em Pirituba, SP | Afro Dreads`;
  const description = `${service.description} Duração de ${service.minHours}h a ${service.maxHours}h, com hora marcada, em Pirituba, São Paulo.`;
  return {
    title,
    description,
    alternates: { canonical: `/servicos/${service.slug}` },
    openGraph: { title, description, url: `/servicos/${service.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const detail = SERVICE_DETAILS[service.slug];
  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            serviceJsonLd(service),
            breadcrumbJsonLd(service.name, `/servicos/${service.slug}`, [
              { name: "Serviços", path: "/servicos" },
            ]),
          ]),
        }}
      />

      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4">
          <AdEyebrow>Serviço</AdEyebrow>
          <AdTitle as="h1" size="hero">
            {service.name} em <em>Pirituba</em>
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">{service.description}</p>
          <AdTag>
            Duração: {service.minHours}h – {service.maxHours}h
          </AdTag>
        </div>
      </div>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          {detail?.video && (
            <video
              controls
              muted
              playsInline
              preload="none"
              poster={detail.video.poster}
              aria-label={`${service.name} feito na Afro Dreads`}
              className="w-full rounded-ad-lg border border-line object-cover"
              style={{ aspectRatio: "3 / 4" }}
            >
              <source src={detail.video.src} type="video/mp4" />
            </video>
          )}
          <div className="flex flex-col items-start gap-6">
            <div>
              <h2 className="m-0 font-serif text-3xl uppercase text-ink">Sobre o serviço</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{detail?.about ?? service.description}</p>
            </div>
            {detail?.bestFor && (
              <div>
                <h2 className="m-0 font-serif text-3xl uppercase text-ink">Para quem é</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{detail.bestFor}</p>
              </div>
            )}
            <div>
              <h2 className="m-0 font-serif text-3xl uppercase text-ink">Valor e agendamento</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                O valor depende do projeto (comprimento, quantidade, espessura, material, cor e tipo de
                procedimento) e é combinado pelo WhatsApp. O horário é reservado com um sinal. Veja as{" "}
                <Link href="/servicos" className="underline underline-offset-4">
                  regras de sinal e cancelamento
                </Link>
                .
              </p>
            </div>
            <AdButton
              href={buildWhatsAppLink(detail?.intent ?? "geral")}
              icon={<WhatsAppIcon className="h-4 w-4" />}
            >
              Agendar {service.name}
            </AdButton>
          </div>
        </div>
      </section>

      <section className="bg-surface-sunken px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="m-0 mb-6 font-serif text-3xl uppercase text-ink">Outros serviços</h2>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {others.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/servicos/${s.slug}`}
                  className="inline-block rounded-full border border-line-strong px-4 py-2 text-sm text-ink hover:bg-surface-raised"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
