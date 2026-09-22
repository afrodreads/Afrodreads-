"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  alt: string;
};

export function BeforeAfterSlider({ beforeSrc, afterSrc, alt }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  function updatePositionFromClientX(clientX: number) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl"
      onMouseMove={(e) => e.buttons === 1 && updatePositionFromClientX(e.clientX)}
      onTouchMove={(e) => updatePositionFromClientX(e.touches[0].clientX)}
    >
      <Image src={afterSrc} alt={`${alt} - depois`} fill loading="lazy" className="object-cover" />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={beforeSrc} alt={`${alt} - antes`} fill loading="lazy" className="object-cover" />
      </div>

      <div
        className="absolute inset-y-0 w-1 cursor-ew-resize bg-brand-yellow"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-yellow text-brand-black shadow-lg">
          ↔
        </div>
      </div>

      <span className="absolute left-3 top-3 rounded-full bg-brand-black/70 px-3 py-1 text-xs font-semibold text-brand-white">
        Antes
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-brand-black/70 px-3 py-1 text-xs font-semibold text-brand-white">
        Depois
      </span>
    </div>
  );
}
