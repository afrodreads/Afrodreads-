"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE } from "@/lib/gsap";

export type FaqItem = { question: string; answer: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <FaqRow key={item.question} item={item} defaultOpen={index === 0} />
      ))}
    </div>
  );
}

function FaqRow({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // O evento "toggle" de <details> não borbulha, então o onToggle
  // declarativo do React não é confiável aqui — ouvimos direto no elemento.
  useEffect(() => {
    const details = detailsRef.current;
    const icon = iconRef.current;
    if (!details || !icon) return;

    function handleToggle() {
      const open = details!.open;
      gsap.to(icon!, {
        rotate: open ? 45 : 0,
        backgroundColor: open ? "#f1bb09" : "transparent",
        color: open ? "#000000" : "#fff8e7",
        duration: 0.3,
        ease: EASE,
      });
    }

    details.addEventListener("toggle", handleToggle);
    return () => details.removeEventListener("toggle", handleToggle);
  }, []);

  return (
    <details ref={detailsRef} className="group rounded-ad-md border border-line bg-surface-raised" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-sans text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {item.question}
        <span
          ref={iconRef}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-line-strong text-ink"
          style={{ transform: defaultOpen ? "rotate(45deg)" : undefined, backgroundColor: defaultOpen ? "#f1bb09" : undefined, color: defaultOpen ? "#000" : undefined }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <div className="px-6 pb-6 text-[15px] leading-relaxed text-ink-muted">{item.answer}</div>
    </details>
  );
}
