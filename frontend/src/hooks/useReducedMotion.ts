"use client"

import { useEffect, useState } from "react"

/**
 * useReducedMotion
 * 
 * Detects the user's OS-level "prefers-reduced-motion" accessibility setting.
 * Use this hook to disable, simplify, or slow down animations for users who
 * have requested reduced motion in their system settings.
 * 
 * WCAG 2.1 SC 2.3.3 (AAA) — Animation from Interactions
 * 
 * @returns `true` if the user prefers reduced motion, `false` otherwise.
 *          Returns `false` during SSR (safe default — motion enabled).
 * 
 * @example
 * function HeroCard() {
 *   const reducedMotion = useReducedMotion()
 *   return (
 *     <motion.div
 *       animate={{ y: reducedMotion ? 0 : -10 }}
 *       transition={{ duration: reducedMotion ? 0 : 0.6 }}
 *     />
 *   )
 * }
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReduced(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReduced
}
