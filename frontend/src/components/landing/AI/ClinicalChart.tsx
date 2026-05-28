"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function ClinicalChart() {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  const points = [
    { x: 30, y: 180, risk: "12%", biomarker: "0.22", label: "T0: Base" },
    { x: 90, y: 150, risk: "28%", biomarker: "0.45", label: "T1: Follow-up" },
    { x: 150, y: 160, risk: "34%", biomarker: "0.38", label: "T2: Cycle 1" },
    { x: 210, y: 100, risk: "52%", biomarker: "0.68", label: "T3: Cycle 2" },
    { x: 270, y: 120, risk: "48%", biomarker: "0.59", label: "T4: Midterm" },
    { x: 330, y: 60, risk: "74%", biomarker: "0.82", label: "T5: Progression" },
    { x: 390, y: 40, risk: "91%", biomarker: "0.94", label: "T6: Crisis" }
  ]

  return (
    <div className="w-full h-full bg-[rgba(11,16,35,0.4)] rounded-2xl flex flex-col justify-between border border-[rgba(255,255,255,0.06)] p-6 relative overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,229,255,0.03)] to-[rgba(255,79,216,0.03)] opacity-40 blur-3xl pointer-events-none" />
      
      {/* Title / Legend */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[rgba(255,255,255,0.4)] uppercase">PROGNOSIS TIMELINE</span>
          <h4 className="text-sm font-bold text-white mt-0.5">Biomarker Trajectory &amp; Risk Forecasting</h4>
        </div>
        <div className="flex gap-4 font-mono text-[9px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#FF4FD8]" />
            <span className="text-[rgba(255,255,255,0.6)]">RISK PROBABILITY</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#00E5FF]" />
            <span className="text-[rgba(255,255,255,0.6)]">BIOMARKER EXPRESSION</span>
          </div>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="flex-1 relative min-h-[180px]">
        <svg className="w-full h-full" viewBox="0 0 420 220" fill="none">
          {/* Grid lines */}
          <line x1="0" y1="200" x2="420" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="0" y1="150" x2="420" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="0" y1="100" x2="420" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="0" y1="50" x2="420" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* Area Gradients */}
          <defs>
            <linearGradient id="areaRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4FD8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FF4FD8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaBio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Areas */}
          <motion.path 
            d="M 30 180 L 90 150 L 150 160 L 210 100 L 270 120 L 330 60 L 390 40 L 390 200 L 30 200 Z" 
            fill="url(#areaRisk)" 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          />

          {/* Lines */}
          <motion.path 
            d="M 30 180 Q 90 150 150 160 T 210 100 T 270 120 T 330 60 T 390 40"
            stroke="#FF4FD8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          <motion.path 
            d="M 30 190 Q 90 170 150 180 T 210 130 T 270 150 T 330 90 T 390 60"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />

          {/* Points / Interactivity */}
          {points.map((p, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)}>
              {/* Vertical line indicator on hover */}
              {hoveredPoint === i && (
                <line x1={p.x} y1="0" x2={p.x} y2="200" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
              )}
              
              <circle cx={p.x} cy={p.y} r="5" fill="#050816" stroke="#FF4FD8" strokeWidth="2" />
              <circle cx={p.x} cy={p.y + 10} r="4.5" fill="#050816" stroke="#00E5FF" strokeWidth="1.5" />
              
              {hoveredPoint === i && (
                <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="#FF4FD8" strokeWidth="1.5" className="animate-ping" />
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip Overlay */}
        <AnimatePresence>
          {hoveredPoint !== null && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bg-[#0b1023]/95 border border-[rgba(255,255,255,0.08)] rounded-lg p-2.5 shadow-2xl z-20 font-mono text-[9px] w-36 pointer-events-none"
              style={{ 
                left: `${points[hoveredPoint].x - 72}px`, 
                top: `${points[hoveredPoint].y - 85}px` 
              }}
            >
              <div className="text-white font-bold mb-1 border-b border-white/5 pb-1">{points[hoveredPoint].label}</div>
              <div className="flex justify-between text-[rgba(255,255,255,0.6)]">
                <span>Risk Score:</span>
                <span className="text-[#FF4FD8] font-bold">{points[hoveredPoint].risk}</span>
              </div>
              <div className="flex justify-between text-[rgba(255,255,255,0.6)] mt-0.5">
                <span>Biomarker:</span>
                <span className="text-[#00E5FF] font-bold">{points[hoveredPoint].biomarker}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between text-[9px] font-mono text-[rgba(255,255,255,0.35)] mt-2">
        <span>T0: CLINICAL INTAKE</span>
        <span>T2: PATIENT PROGRESSION</span>
        <span>T6: LATEST ANALYSIS</span>
      </div>
    </div>
  )
}
