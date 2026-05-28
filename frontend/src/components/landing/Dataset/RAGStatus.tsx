"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ragEngineStates } from "@/data/mock/rag"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { DURATION, EASE } from "@/config/motion"

export function RAGStatus() {
  const [index, setIndex] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    // On reduced-motion, skip cycling — show final "indexed" state directly.
    if (reducedMotion) {
      setIndex(ragEngineStates.length - 1)
      return
    }
    // Loop through states, pausing longer on the final "complete" state.
    const isLast = index === ragEngineStates.length - 1
    const delay = isLast ? 5000 : 2500

    const timeout = setTimeout(() => {
      setIndex((prev) => (prev + 1) % ragEngineStates.length)
    }, delay)

    return () => clearTimeout(timeout)
  }, [index, reducedMotion])

  const isIndexed = index === ragEngineStates.length - 1

  return (
    <div
      className="rag-live glass-card mt-12 overflow-hidden relative flex items-center gap-3"
      aria-live="polite"
      aria-atomic="true"
      role="status"
      aria-label="Status do RAG Engine"
    >
      {/* Pulsing status dot — static on reduced-motion */}
      <motion.div
        className="rag-live__dot flex-shrink-0"
        aria-hidden="true"
        animate={reducedMotion ? undefined : {
          scale:           isIndexed ? [1, 1.2, 1]     : [1, 1.5, 1],
          opacity:         isIndexed ? [0.7, 1, 0.7]   : [0.5, 1, 0.5],
          backgroundColor: isIndexed ? "var(--emerald)" : "var(--cyan)",
          boxShadow:       isIndexed
            ? "0 0 10px var(--emerald)"
            : "0 0 15px var(--cyan)",
        }}
        style={{
          // Instant static state for reduced-motion users
          backgroundColor: isIndexed ? "var(--emerald)" : "var(--cyan)",
          boxShadow:       isIndexed
            ? "0 0 10px var(--emerald)"
            : "0 0 8px var(--cyan)",
        }}
        transition={{
          duration: isIndexed ? 2 : 1,
          repeat:   Infinity,
          ease:     "easeInOut",
        }}
      />

      {/* Animated status text */}
      <div className="relative h-6 flex-1 w-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 10, filter: "blur(4px)" }
            }
            animate={reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            exit={reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -10, filter: "blur(4px)" }
            }
            transition={{ duration: reducedMotion ? DURATION.fast : 0.4, ease: EASE.out }}
            className="absolute whitespace-nowrap text-sm md:text-base font-mono text-[var(--t1)]"
          >
            {isIndexed && (
              <span className="text-[var(--emerald)]">✓ </span>
            )}
            {ragEngineStates[index]}
            {!isIndexed ? (
              <motion.span
                animate={reducedMotion ? undefined : { opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ...
              </motion.span>
            ) : (
              <span className="text-[var(--t3)] ml-2">· updated just now</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
