"use client";

import { ServiceListRow } from "@/components/servicos/ServiceListRow";
import { SERVICE_VIDEOS } from "@/components/servicos/ServiceCarouselList";
import type { ServiceDefinition } from "@/lib/services";

// Lista em rolagem vertical (1 coluna no celular, grade no desktop), no
// mesmo formato do portfolio. Cada card toca o proprio video quando aparece.
export function ServiceGridList({ services }: { services: ServiceDefinition[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service, index) => (
        <ServiceListRow
          key={service.slug}
          service={service}
          index={index}
          video={SERVICE_VIDEOS[service.slug]}
        />
      ))}
    </div>
  );
}
