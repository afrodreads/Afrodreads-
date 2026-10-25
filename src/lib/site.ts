// Endereco oficial do site para SEO (canonical, sitemap, robots, JSON-LD,
// llms.txt). Fixo de proposito: NEXT_PUBLIC_SITE_URL na Vercel aponta para
// afrodreads.vercel.app e e usado pelos fluxos de pagamento, entao nao serve
// como endereco publico para o Google. O dominio sem www redireciona para ca.
export const CANONICAL_URL = "https://www.afrodreads.com.br";

// Endereço do estúdio, igual ao do perfil no Google (o dono autorizou a
// divulgação em 2026-09-30). Fonte única: site, JSON-LD e llms.txt usam daqui.
export const BUSINESS_ADDRESS = {
  street: "R. Pedro Marigliani, 43",
  neighborhood: "Chácara Inglesa",
  city: "São Paulo",
  region: "SP",
  postalCode: "05141-010",
  latitude: -23.49409,
  longitude: -46.73062,
} as const;

export const BUSINESS_ADDRESS_LINE = `${BUSINESS_ADDRESS.street} – ${BUSINESS_ADDRESS.neighborhood}, ${BUSINESS_ADDRESS.city} – ${BUSINESS_ADDRESS.region}, ${BUSINESS_ADDRESS.postalCode}`;
