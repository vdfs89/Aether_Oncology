/**
 * src/animations/fade.ts
 * Fade animation presets — uses motion.ts tokens.
 */
import { Variants } from "framer-motion"
import { DURATION, EASE } from "@/config/motion"

/**
 * fadeUp — Primary hero/section reveal.
 * Calibrated for biotech: deliberate but not slow.
 * Duration: 0.6s (was 0.75 — shaved for more responsive Hero feel)
 */
export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y:       0,
    transition: {
      duration: DURATION.standard,  // 0.35s base but use medium (0.55) for reveals
      ease:     EASE.out,
    },
  },
}

/**
 * fadeUpSlow — Section-level reveal (below fold, more deliberate).
 */
export const fadeUpSlow: Variants = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y:       0,
    transition: {
      duration: DURATION.slow,  // 0.8s — deep sections
      ease:     EASE.out,
    },
  },
}

/**
 * fadeIn — Pure opacity, no Y movement.
 * For subtle reveals: captions, metadata, secondary text.
 */
export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.medium,  // 0.55s
      ease:     EASE.out,
    },
  },
}

/**
 * fadeInReduced — For prefers-reduced-motion contexts.
 * Instant opacity, no movement.
 */
export const fadeInReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast },  // 0.2s
  },
}
