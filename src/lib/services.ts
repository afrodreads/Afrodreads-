export type ServiceDefinition = {
  slug: string;
  name: string;
  minHours: number;
  maxHours: number;
  description: string;
  order: number;
};

// Fonte única de verdade para os serviços oferecidos e suas durações.
// Usado pelo seed do banco, pela UI de agendamento e pelo cálculo de horários.
export const SERVICES: ServiceDefinition[] = [
  {
    slug: "primeira-aplicacao-topo",
    name: "Primeira aplicação (topo)",
    minHours: 3,
    maxHours: 5,
    description: "Formação inicial dos dreadlocks na região do topo da cabeça.",
    order: 1,
  },
  {
    slug: "cabeca-toda",
    name: "Primeira aplicação (cabeça toda)",
    minHours: 4,
    maxHours: 8,
    description: "Formação completa dos dreadlocks em toda a cabeça.",
    order: 2,
  },
  {
    slug: "microlocs",
    name: "Microlocs",
    minHours: 8,
    maxHours: 12,
    description: "Dreadlocks finos, formados fio a fio para um acabamento delicado.",
    order: 3,
  },
  {
    slug: "retwist",
    name: "Retwist",
    minHours: 3,
    maxHours: 5,
    description: "Manutenção da raiz para manter os dreads alinhados.",
    order: 4,
  },
  {
    slug: "retwist-twist",
    name: "Start Locs",
    minHours: 3,
    maxHours: 5,
    description: "Manutenção da raiz combinada com torção ao longo do fio.",
    order: 5,
  },
  {
    slug: "revitalizacao",
    name: "Revitalização",
    minHours: 6,
    maxHours: 8,
    description: "Tratamento para renovar e revitalizar dreadlocks já formados.",
    order: 6,
  },
  {
    slug: "penteados",
    name: "Penteados",
    minHours: 2,
    maxHours: 5,
    description: "Penteados e finalizações para dreadlocks e microlocs.",
    order: 7,
  },
  {
    slug: "short-dread",
    name: "Short Dread",
    minHours: 3,
    maxHours: 5,
    description: "Formação de dreadlocks curtos, com um visual mais discreto e prático.",
    order: 8,
  },
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
