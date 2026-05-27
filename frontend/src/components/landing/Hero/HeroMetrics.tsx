"use client"

import { METRICS } from "@/config/metrics"
import { motion } from "framer-motion"
import { staggerContainer } from "@/animations/stagger"
import { fadeUp } from "@/animations/fade"

export function HeroMetrics() {
  return (
    <motion.div 
      className="hero-metrics" 
      role="list" 
      aria-label="Métricas clínicas"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {METRICS.hero.map((metric, idx) => (
        <motion.div key={idx} variants={fadeUp} className="flex items-center gap-4">
          <div className="metric-card" role="listitem">
            <span className="metric-card__value">
              {metric.value}
              <span className="text-[0.65em] opacity-80">{metric.suffix}</span>
            </span>
            <span className="metric-card__label">{metric.label}</span>
          </div>
          {idx < METRICS.hero.length - 1 && (
            <div className="metric-card metric-card--divider" aria-hidden="true"></div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}
