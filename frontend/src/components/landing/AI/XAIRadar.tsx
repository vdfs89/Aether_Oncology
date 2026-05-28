"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function XAIRadar() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const nodes = [
    { id: "BRCA1", label: "BRCA1 Locus", score: "+0.48", type: "Pathogenic Overexpression", x: 150, y: 35, color: "#FF4FD8" },
    { id: "TP53", label: "TP53 Deletion", score: "+0.32", type: "Loss of Function Mutation", x: 235, y: 95, color: "#8B5CFF" },
    { id: "HER2", label: "HER2 Amplification", score: "+0.18", type: "Borderline High Expression", x: 200, y: 195, color: "#00E5FF" },
    { id: "PTEN", label: "PTEN Suppression", score: "-0.08", type: "Normal Genomic State", x: 100, y: 195, color: "#00FF99" },
    { id: "BRCA2", label: "BRCA2 Normal", score: "+0.04", type: "Normal Genomic State", x: 65, y: 95, color: "#8B5CFF" }
  ]

  const centerNode = { label: "Recommendation", x: 150, y: 120 }

  return (
    <div className="w-full h-full bg-[rgba(11,16,35,0.4)] rounded-2xl flex flex-col justify-between border border-[rgba(255,255,255,0.06)] p-6 relative overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(139,92,255,0.03)] to-[rgba(0,229,255,0.03)] opacity-40 blur-3xl pointer-events-none" />
      
      {/* Title */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[rgba(255,255,255,0.4)] uppercase">EXPLAINABILITY CORE</span>
          <h4 className="text-sm font-bold text-white mt-0.5">Biomarker Correlation Network</h4>
        </div>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(139,92,255,0.1)] text-[#8B5CFF] border border-[#8B5CFF]/20">SHAP ANALYSIS</span>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative min-h-[220px] flex items-center justify-center">
        <svg className="w-full max-w-[300px] h-[220px]" viewBox="0 0 300 240" fill="none">
          {/* Radial concentric rings */}
          <circle cx={centerNode.x} cy={centerNode.y} r="85" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={centerNode.x} cy={centerNode.y} r="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <circle cx={centerNode.x} cy={centerNode.y} r="35" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="2,2" />

          {/* Connection Lines with glowing properties */}
          {nodes.map((n, i) => (
            <g key={i}>
              <line 
                x1={centerNode.x} 
                y1={centerNode.y} 
                x2={n.x} 
                y2={n.y} 
                stroke={hoveredNode === n.id ? n.color : "rgba(255,255,255,0.08)"} 
                strokeWidth={hoveredNode === n.id ? 2 : 1.2} 
                style={{ transition: "all 0.2s" }}
              />
              
              {/* Traveling light particle on connections */}
              <motion.circle 
                r="2.5" 
                fill={n.color} 
                animate={{ 
                  cx: [centerNode.x, n.x], 
                  cy: [centerNode.y, n.y] 
                }} 
                transition={{ 
                  repeat: Infinity, 
                  duration: 2 + i * 0.4, 
                  ease: "easeInOut" 
                }} 
              />
            </g>
          ))}

          {/* Center core recommendation node */}
          <circle cx={centerNode.x} cy={centerNode.y} r="18" fill="#050816" stroke="var(--cyan)" strokeWidth="2.5" />
          <circle cx={centerNode.x} cy={centerNode.y} r="23" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.1" />
          <text x={centerNode.x} y={centerNode.y + 3} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" fontFamily="monospace">CORE</text>

          {/* Gene Nodes */}
          {nodes.map((n, i) => (
            <g 
              key={i} 
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle cx={n.x} cy={n.y} r="12" fill="#050816" stroke={n.color} strokeWidth="1.8" />
              
              {hoveredNode === n.id && (
                <motion.circle cx={n.x} cy={n.y} r="16" stroke={n.color} strokeWidth="1" fill="none" animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              )}
              
              <text x={n.x} y={n.y + 2.5} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" fontFamily="monospace">{n.id}</text>
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {hoveredNode !== null && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bg-[#0b1023]/95 border border-[rgba(255,255,255,0.08)] rounded-xl p-3 shadow-2xl z-20 font-mono text-[9px] w-48 pointer-events-none"
              style={{
                left: `${nodes.find(n => n.id === hoveredNode)!.x - 96}px`,
                top: `${nodes.find(n => n.id === hoveredNode)!.y - 100}px`
              }}
            >
              <div className="flex justify-between items-center mb-1.5 border-b border-white/5 pb-1.5">
                <span className="text-white font-bold">{nodes.find(n => n.id === hoveredNode)!.id} Attribution</span>
                <span className="text-[#00E5FF] font-bold">{nodes.find(n => n.id === hoveredNode)!.score}</span>
              </div>
              <div className="text-[rgba(255,255,255,0.6)] text-[8px] leading-tight">
                {nodes.find(n => n.id === hoveredNode)!.type}
              </div>
              <div className="text-[rgba(255,255,255,0.45)] text-[7px] mt-1.5 leading-snug">
                Counterfactual weights resolved dynamically during inference.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-[8px] font-mono text-[rgba(255,255,255,0.3)] text-center mt-2">
        Hover nodes to inspect SHAP feature attributions in real time.
      </div>
    </div>
  )
}
