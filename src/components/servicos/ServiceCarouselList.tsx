import { ServiceListRow, type ServiceVideo } from "@/components/servicos/ServiceListRow";
import type { ServiceDefinition } from "@/lib/services";

// Videos reais por servico (arquivos em public/services/). Servicos sem
// entrada aqui continuam mostrando o placeholder de foto no ServiceListRow.
const SERVICE_VIDEOS: Record<string, ServiceVideo> = {
  retwist: { src: "/services/retwist.mp4", poster: "/services/retwist-poster.jpg" },
  microlocs: { src: "/services/microlocs.mp4", poster: "/services/microlocs-poster.jpg" },
};

// Carrossel arrastavel (cards 3:4) em todos os tamanhos de tela.
export function ServiceCarouselList({ services }: { services: ServiceDefinition[] }) {
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      {services.map((service, index) => (
        <div key={service.slug} className="w-[240px] shrink-0 snap-start sm:w-[280px]">
          <ServiceListRow service={service} index={index} video={SERVICE_VIDEOS[service.slug]} />
        </div>
      ))}
    </div>
  );
}
