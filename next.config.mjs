/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  // "Start Locs": URL pública /servicos/start-locs; a página continua sendo a do
  // slug interno retwist-twist (ver PUBLIC_SERVICE_SLUGS em src/lib/services.ts).
  async redirects() {
    return [{ source: "/servicos/retwist-twist", destination: "/servicos/start-locs", permanent: true }];
  },
  async rewrites() {
    return [{ source: "/servicos/start-locs", destination: "/servicos/retwist-twist" }];
  },
  // A entrada do agente (modo sombra) lê o prompt V2 do disco em tempo de execução.
  outputFileTracingIncludes: {
    "/api/agent/inbound": ["./agente/00-prompt-do-agente-v2.md"],
  },
};

export default nextConfig;
