"use client";

import { motion } from "framer-motion";
import { SERVICES } from "@/lib/services";

export function ServicesSection() {
  return (
    <section id="servicos" className="bg-brand-black px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="font-display text-3xl font-bold text-brand-white sm:text-4xl"
        >
          Nossos <span className="text-brand-yellow">serviços</span>
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, index) => (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group rounded-2xl border border-white/10 bg-brand-gray p-6 transition-colors hover:border-brand-yellow/60"
            >
              <p className="font-display text-lg font-bold text-brand-white group-hover:text-brand-yellow">
                {service.name}
              </p>
              <p className="mt-2 text-sm text-brand-white/60">{service.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-yellow">
                {service.minHours}h – {service.maxHours}h
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
