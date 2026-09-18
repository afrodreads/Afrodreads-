"use client";

import { useState } from "react";
import Image from "next/image";

const COLOR_OPTIONS = [
  { name: "Natural", hueRotate: 0, saturate: 1 },
  { name: "Vermelho borgonha", hueRotate: 330, saturate: 1.4 },
  { name: "Castanho avermelhado", hueRotate: 15, saturate: 1.2 },
  { name: "Loiro mel", hueRotate: 40, saturate: 1.3 },
  { name: "Grafite", hueRotate: 0, saturate: 0.15 },
];

/**
 * Simulador MVP: aplica um filtro CSS (hue-rotate/saturate) sobre uma foto de
 * referência para dar uma prévia aproximada da cor. Não é uma simulação fiel
 * fio a fio — evolução futura pode usar segmentação de imagem por IA.
 */
export function StyleSimulator({ referenceImageSrc }: { referenceImageSrc: string }) {
  const [selected, setSelected] = useState(COLOR_OPTIONS[0]);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
      <div className="relative aspect-square overflow-hidden rounded-2xl">
        <Image
          src={referenceImageSrc}
          alt="Prévia de cor nos dreads"
          fill
          className="object-cover transition-[filter] duration-500"
          style={{
            filter: `hue-rotate(${selected.hueRotate}deg) saturate(${selected.saturate})`,
          }}
        />
      </div>

      <div>
        <p className="font-display text-2xl font-bold text-brand-white">
          Simule sua cor
        </p>
        <p className="mt-2 text-sm text-brand-white/60">
          Escolha uma cor de referência para visualizar como pode ficar. O resultado final
          depende do tom natural do fio — combine com a gente na consulta.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.name}
              onClick={() => setSelected(option)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selected.name === option.name
                  ? "border-brand-yellow bg-brand-yellow text-brand-black"
                  : "border-white/20 text-brand-white/80 hover:border-brand-yellow"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
