"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { AdTag } from "@/components/ui/Tag";

type BeforeAfterSliderProps = {
  title?: string;
  beforeSrc: string;
  afterSrc: string;
  alt: string;
  beforeAlt?: string;
  afterAlt?: string;
};

export function BeforeAfterSlider({
  title,
  beforeSrc,
  afterSrc,
  alt,
  beforeAlt,
  afterAlt,
}: BeforeAfterSliderProps) {
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
      className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-ad-lg border border-line"
      style={{ touchAction: "pan-y" }}
      onMouseMove={(e) => e.buttons === 1 && updatePositionFromClientX(e.clientX)}
      onTouchMove={(e) => updatePositionFromClientX(e.touches[0].clientX)}
    >
      <SafeImage
        src={afterSrc}
        alt={afterAlt ?? `${alt} - depois`}
        fill
        loading="lazy"
        className="object-cover object-center"
        placeholderVariant="sun"
      />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <SafeImage
          src={beforeSrc}
          alt={beforeAlt ?? `${alt} - antes`}
          fill
          loading="lazy"
          className="object-cover object-center"
          placeholderVariant="default"
        />
      </div>

      {title && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <h3 className="m-0 font-serif text-xl font-normal uppercase leading-none tracking-tight text-white">
            {title}
          </h3>
        </div>
      )}

      <div className="absolute inset-y-0 w-[3px] bg-amarelo" style={{ left: `${position}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-black bg-amarelo text-amarelo-on shadow-lg">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <path
              d="M7 5L2 10l5 5M13 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Comparar antes e depois"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        style={{ touchAction: "pan-y" }}
      />

      <span className="pointer-events-none absolute left-3 top-3">
        <AdTag variant="neutral">Antes</AdTag>
      </span>
      <span className="pointer-events-none absolute right-3 top-3">
        <AdTag variant="amarelo">Depois</AdTag>
      </span>
    </div>
  );
}
