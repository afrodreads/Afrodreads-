import type { Metadata } from "next";
import { Anton, Inter, Instrument_Serif, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { businessJsonLd } from "@/lib/seo";

const display = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

// Novo design system ("Claude Design"): usados pelos componentes do site de
// marketing (home, serviços, portfólio, contato) via as classes utilitárias
// font-serif/font-sans/font-mono do Tailwind. Admin/checkout continuam com
// Anton/Inter acima, sem mudança.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://afrodreads.com.br";

const TITLE = "Dreadlocks e Microlocs em Pirituba, SP | Afro Dreads";
const DESCRIPTION =
  "Estúdio especializado em dreadlocks e microlocs em Pirituba, SP. Formação, manutenção e revitalização com técnica e cuidado. Agende online.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Afro Dreads",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${display.variable} ${body.variable} ${instrumentSerif.variable} ${dmSans.variable} ${dmMono.variable} font-body bg-brand-black text-brand-white antialiased`}
      >
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
