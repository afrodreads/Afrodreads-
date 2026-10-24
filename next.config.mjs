/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  // A entrada do agente (modo sombra) lê o prompt V2 e as fotos de referência do disco em tempo de execução.
  outputFileTracingIncludes: {
    "/api/agent/inbound": ["./agente/00-prompt-do-agente-v2.md", "./agente/08-camada-comercial.md", "./agente/referencias/*.jpg"],
  },
};

export default nextConfig;
