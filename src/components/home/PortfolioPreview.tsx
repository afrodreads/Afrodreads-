"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";

const CASES = [
  { before: "/images/portfolio/caso-1-antes.jpg", after: "/images/portfolio/caso-1-depois.jpg", alt: "Formação de dreadlocks" },
  { before: "/images/portfolio/caso-2-antes.jpg", after: "/images/portfolio/caso-2-depois.jpg", alt: "Microlocs" },
  { before: "/images/portfolio/caso-3-antes.jpg", after: "/images/portfolio/caso-3-depois.jpg", alt: "Retwist" },
];

export function PortfolioPreview() {
  return (
    <section className="bg-brand-black px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow">
              Transformações
            </p>
            <h2 className="font-display text-3xl uppercase text-brand-white sm:text-5xl">
              Antes <span className="text-brand-yellow">e</span> depois
            </h2>
          </div>
          <Link
            href="/portfolio"
            className="whitespace-nowrap rounded-full border border-white/30 px-6 py-2 text-sm font-semibold text-brand-white transition-colors hover:border-brand-yellow hover:text-brand-yellow"
          >
            Ver portfólio completo
          </Link>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CASES.map((item, index) => (
            <motion.div
              key={item.alt}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <BeforeAfterSlider beforeSrc={item.before} afterSrc={item.after} alt={item.alt} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
