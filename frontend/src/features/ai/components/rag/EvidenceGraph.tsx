"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Citation } from "../../types"

export function EvidenceGraph({ citations }: { citations: Citation[] }) {
  return (
    <div className="w-full h-full flex items-center justify-center relative bg-[#0B1120] rounded border border-[#1A2235]">
      {/* Central Node (Query) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute z-10 w-12 h-12 bg-cyan-900/50 border-2 border-cyan-500 rounded-full flex items-center justify-center"
      >
        <span className="text-[10px] text-cyan-300 font-bold">Q</span>
      </motion.div>

      {/* Orbiting Citations */}
      {citations.map((c, i) => {
        const angle = (i / citations.length) * 2 * Math.PI
        const radius = 80 // pixels
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        return (
          <React.Fragment key={c.id}>
            {/* Connecting Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <motion.line 
                x1="50%" y1="50%" 
                x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                stroke="#1A2235"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </svg>

            {/* Citation Node */}
            <motion.div
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x, y, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 + i * 0.1 }}
              className="absolute z-10"
              style={{ left: "calc(50% - 16px)", top: "calc(50% - 16px)" }}
            >
              <div 
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300 font-mono shadow-lg hover:border-cyan-500 transition-colors cursor-pointer"
                title={c.title}
              >
                [{i + 1}]
              </div>
            </motion.div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
