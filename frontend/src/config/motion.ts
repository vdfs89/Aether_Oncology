/**
 * src/config/motion.ts
 * Central motion configuration — single source of truth for all animation
 * durations, easings, spring configs and stagger delays across the platform.
 * 
 * Rule: NO magic numbers in component files. Import from here.
 */

import type { Transition, Spring, Tween } from "framer-motion"

// ── Durations (seconds) ────────────────────────────────────────────────────────
export const DURATION = {
  /** Instant feedback — toggles, chips */
  instant:  0.1,
  /** Fast micro-interactions — hover states, button clicks */
  fast:     0.2,
  /** Standard transitions — modals, panels, tooltips */
  standard: 0.35,
  /** Deliberate reveals — section entrances, hero elements */
  medium:   0.55,
  /** Slow cinematic entrances — page-level animations */
  slow:     0.8,
  /** Stagger child offset — added per child element */
  stagger:  0.08,
  /** Chart reveal — data drawing animations */
  chart:    1.2,
} as const

// ── Easing Curves ──────────────────────────────────────────────────────────────
// Named as semantic intents rather than raw cubic-bezier strings.
export const EASE = {
  /** Smooth deceleration — elements entering the screen */
  out:      [0.0, 0.0, 0.2, 1.0]  as [number, number, number, number],
  /** Smooth acceleration — elements leaving the screen */
  in:       [0.4, 0.0, 1.0, 1.0]  as [number, number, number, number],
  /** Standard Material-style — most transitions */
  inOut:    [0.4, 0.0, 0.2, 1.0]  as [number, number, number, number],
  /** Overshoot — playful interactive elements */
  spring:   [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const

// ── Spring Configs ─────────────────────────────────────────────────────────────
export const SPRING = {
  /** Snappy hover — cards, buttons */
  snap: {
    type:      "spring" as const,
    stiffness: 400,
    damping:   30,
  },
  /** Gentle float — floating elements, ambient motion */
  float: {
    type:      "spring" as const,
    stiffness: 80,
    damping:   20,
    mass:      1.2,
  },
  /** Precise — chart elements, data points */
  precise: {
    type:      "spring" as const,
    stiffness: 300,
    damping:   40,
  },
} as const

// ── Stagger Configs ────────────────────────────────────────────────────────────
export const STAGGER = {
  /** Fast — tight lists, chips, tags */
  fast: {
    staggerChildren:  0.05,
    delayChildren:    0,
  },
  /** Standard — cards, bento grids */
  standard: {
    staggerChildren:  DURATION.stagger,
    delayChildren:    0.1,
  },
  /** Slow — hero sequences, heavy reveals */
  slow: {
    staggerChildren:  0.12,
    delayChildren:    0.2,
  },
} as const

// ── Reusable Transition Objects ────────────────────────────────────────────────
export const TRANSITION: Record<string, Tween | Spring | Transition> = {
  /** Default enter transition */
  enter: {
    duration: DURATION.standard,
    ease:     EASE.out,
  },
  /** Default exit transition */
  exit: {
    duration: DURATION.fast,
    ease:     EASE.in,
  },
  /** Hover micro-interaction */
  hover: {
    duration: DURATION.fast,
    ease:     EASE.out,
  },
  /** Chart data reveal */
  chart: {
    duration: DURATION.chart,
    ease:     EASE.out,
  },
}

// ── Viewport Thresholds ────────────────────────────────────────────────────────
export const VIEWPORT = {
  /** Standard scroll reveal — most sections */
  standard: { once: true, margin: "-60px" },
  /** Eager — near top of screen sections */
  eager:    { once: true, margin: "0px" },
  /** Lazy — deep sections below fold */
  lazy:     { once: true, margin: "-120px" },
} as const

// ── prefers-reduced-motion helper ──────────────────────────────────────────────
/**
 * Returns `value` if motion is allowed by OS settings, else `fallback`.
 * Use for opacity-only fallbacks when user has reduced-motion enabled.
 * 
 * @example
 * const y = withReducedMotion(30, 0) // y=30 normally, y=0 on reduced-motion
 */
export function withReducedMotion<T>(value: T, fallback: T): T {
  if (typeof window === "undefined") return value
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? fallback
    : value
}
