"use client";

import { motion } from "framer-motion";
import { StyleSimulator } from "@/components/portfolio/StyleSimulator";

export function StyleSimulatorSection() {
  return (
    <section className="bg-brand-gray px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow"
        >
          Antes de agendar
        </motion.p>

        <StyleSimulator referenceImageSrc="/images/portfolio/caso-1-depois.jpg" />
      </div>
    </section>
  );
}
