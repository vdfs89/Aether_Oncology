/**
 * src/animations/stagger.ts
 * Stagger animation presets — powered by src/config/motion.ts tokens.
 * Includes reduced-motion variants for accessibility compliance.
 */
import { Variants } from "framer-motion"
import { STAGGER, SPRING } from "@/config/motion"

// ── Standard Stagger ───────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.standard.staggerChildren,
      delayChildren:   STAGGER.standard.delayChildren,
    },
  },
}

export const staggerItem: Variants = {
  hidden:   { opacity: 0, y: 24, filter: "blur(8px)" },
  visible:  {
    opacity: 1,
    y:       0,
    filter:  "blur(0px)",
    transition: {
      type:      SPRING.precise.type,
      stiffness: SPRING.precise.stiffness,
      damping:   SPRING.precise.damping,
    },
  },
}

// ── Fast Stagger (tight lists, chips) ─────────────────────────────────────────

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.fast.staggerChildren,
      delayChildren:   STAGGER.fast.delayChildren,
    },
  },
}

export const staggerItemFast: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y:       0,
    transition: { duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] },
  },
}

// ── Reduced-Motion Variants ────────────────────────────────────────────────────
// Use these when useReducedMotion() returns true.
// No Y movement, no blur — only opacity fade.

export const staggerContainerReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren:   0,
    },
  },
}

export const staggerItemReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
}
