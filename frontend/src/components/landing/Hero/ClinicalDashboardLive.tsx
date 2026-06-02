"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Citações ILUSTRATIVAS (demo de UI do RAG) — não são estudos reais nem validação do Aether.
const REFERENCES = [
  { id: "DEMO-1", source: "PubMed", text: "[ilustrativo] Fatores de risco para câncer oral: tabaco e álcool.", match: "—" },
  { id: "DEMO-2", source: "Cochrane", text: "[ilustrativo] Revisão sistemática — triagem de lesões orais.", match: "—" },
  { id: "DEMO-3", source: "Semantic Scholar", text: "[ilustrativo] Disparidades regionais na incidência de câncer oral.", match: "—" }
]

// Mock terminal inferences
const INFERENCE_STEPS = [
  "Initializing clinical inference pipeline...",
  "Context loaded: Patient H. Vasconcelos (Age: 54, BRCA1+, TP53+)...",
  "Executing genomic alignment against ONNX local registry...",
  "Querying PubMed & ClinVar via vector database (RAG)...",
  "Citations resolved (ilustrativo): DEMO-1 & DEMO-2...",
  "Monte Carlo Dropout completed with 256 samples (Variance: 0.014)...",
  "Clinical decision recommendation generated: SUSCEPTIBLE."
]

export function ClinicalDashboardLive() {
  const [activeTab, setActiveTab] = useState<"graph" | "timeline" | "shap">("graph")
  const [terminalIndex, setTerminalIndex] = useState(0)
  const [pulse, setPulse] = useState(true)

  // Simulation of terminal logs typing
  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalIndex((prev) => (prev + 1) % INFERENCE_STEPS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Heartbeat signal pulse
  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => !p)
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full relative rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[#0b0e1e]/90 to-[#05060b]/95 backdrop-blur-xl shadow-[0_50px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden text-xs">
      
      {/* ── HEADER TELEMETRY ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#070914]/80">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 height-2.5 w-2.5 h-2.5 rounded-full bg-[#FF3CAC]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF99]" />
          </div>
          <span className="text-[10px] tracking-wider text-[rgba(255,255,255,0.4)] font-mono">NODE: ON-PREM-SAO-01 // LATENCY: 1.2ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full bg-[#00FF99] transition-all duration-500 ${pulse ? 'scale-110 shadow-[0_0_8px_#00FF99]' : 'scale-90 opacity-60'}`} />
          <span className="text-[10px] font-bold text-[#00FF99] tracking-wider font-mono">LIVE CONNECTED</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* ── LADO ESQUERDO: CONTEXT & BIOMARKERS ── */}
        <div className="md:col-span-5 flex flex-col gap-4">
          
          {/* Card: Paciente */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
            <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-2">PATIENT PROFILE</div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-white">H. Vasconcelos</span>
              <span className="font-mono text-[#00E5FF] font-bold">#AET-8832</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[10px] text-[rgba(255,255,255,0.5)] font-mono">
              <div>Age: <span className="text-white">54</span></div>
              <div>Gender: <span className="text-white">F</span></div>
              <div>Stage: <span className="text-white">III-B</span></div>
              <div>Origin: <span className="text-white">Breast</span></div>
            </div>
          </div>

          {/* Card: Genômica e Biomarcadores */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex-1">
            <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-2.5">GENOMIC INTELLIGENCE</div>
            <div className="flex flex-col gap-2">
              
              <div className="flex items-center justify-between p-2 rounded bg-[rgba(255,79,216,0.05)] border border-[rgba(255,79,216,0.15)]">
                <div>
                  <span className="font-bold text-[#FF4FD8]">BRCA1</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Overexpression (Locus 17q21.31)</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#FF4FD8]/20 text-[#FF4FD8] rounded">HIGH RISK</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[rgba(139,92,255,0.05)] border border-[rgba(139,92,255,0.15)]">
                <div>
                  <span className="font-bold text-[#8B5CFF]">TP53</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Loss of Function Mutation</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#8B5CFF]/20 text-[#8B5CFF] rounded">PATHOGENIC</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[rgba(0,229,255,0.05)] border border-[rgba(0,229,255,0.15)]">
                <div>
                  <span className="font-bold text-[#00E5FF]">HER2</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Amplification negative</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded">BORDERLINE</span>
              </div>

            </div>
          </div>

        </div>

        {/* ── LADO DIREITO: INTERACTIVE WORKSPACE ── */}
        <div className="md:col-span-7 flex flex-col gap-4">
          
          {/* Top row: Confidence & Risk status */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">CONFIDENCE SCORE</div>
                <div className="text-xl font-black text-white font-mono">98.6%</div>
                <div className="text-[8px] text-[rgba(255,255,255,0.4)] font-mono">Monte Carlo · 256 samples</div>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[rgba(255,255,255,0.05)]" stroke="currentColor" strokeWidth="2.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <motion.path 
                    className="text-[#00E5FF]" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeDasharray="98.6, 100" 
                    strokeLinecap="round" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 0.986 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute text-[8px] font-mono text-[rgba(255,255,255,0.6)]">ONNX</span>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">CLINICAL RISK</div>
                <div className="text-xl font-black text-[#FF3CAC] font-mono">HIGH RISK</div>
                <div className="text-[8px] text-[rgba(255,255,255,0.4)] font-mono">Progression alert triggers active</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#FF3CAC]/10 flex items-center justify-center border border-[#FF3CAC]/25">
                <span className="w-3 h-3 rounded-full bg-[#FF3CAC] animate-ping" />
              </div>
            </div>

          </div>

          {/* Central Workspace Card: Tabs */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex-1 flex flex-col min-h-[220px]">
            
            {/* Tabs */}
            <div className="flex border-b border-[rgba(255,255,255,0.06)] pb-2 mb-3 gap-2">
              <button 
                onClick={() => setActiveTab("graph")} 
                className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold transition-all ${activeTab === "graph" ? 'bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.08)]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              >
                RAG EVIDENCE GRAPH
              </button>
              <button 
                onClick={() => setActiveTab("timeline")} 
                className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold transition-all ${activeTab === "timeline" ? 'bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.08)]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              >
                RETRIEVAL TIMELINE
              </button>
              <button 
                onClick={() => setActiveTab("shap")} 
                className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold transition-all ${activeTab === "shap" ? 'bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.08)]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              >
                SHAP EXPLAINABILITY
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* 1. Evidence Graph */}
                {activeTab === "graph" && (
                  <motion.div 
                    key="graph"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full min-h-[160px] flex items-center justify-center"
                  >
                    <svg className="w-full max-w-[280px] h-[160px]" viewBox="0 0 200 120">
                      {/* Lines */}
                      <motion.line x1="100" y1="60" x2="35" y2="30" stroke="rgba(255,79,216,0.3)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                      <motion.line x1="100" y1="60" x2="165" y2="30" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                      <motion.line x1="100" y1="60" x2="100" y2="100" stroke="rgba(139,92,255,0.3)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                      
                      {/* Central Query Node */}
                      <circle cx="100" cy="60" r="14" fill="#0b0e1e" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="100" cy="60" r="18" fill="transparent" stroke="#fff" strokeWidth="1" opacity="0.15" />
                      <text x="100" y="63" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" fontFamily="monospace">QUERY</text>

                      {/* Node BRCA1 */}
                      <circle cx="35" cy="30" r="10" fill="#0b0e1e" stroke="#FF4FD8" strokeWidth="1.5" />
                      <motion.circle cx="35" cy="30" r="13" fill="transparent" stroke="#FF4FD8" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} />
                      <text x="35" y="32" textAnchor="middle" fill="#FF4FD8" fontSize="5" fontWeight="bold" fontFamily="monospace">BRCA1</text>

                      {/* Node PubMed */}
                      <circle cx="165" cy="30" r="10" fill="#0b0e1e" stroke="#00E5FF" strokeWidth="1.5" />
                      <motion.circle cx="165" cy="30" r="13" fill="transparent" stroke="#00E5FF" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2.2 }} />
                      <text x="165" y="32" textAnchor="middle" fill="#00E5FF" fontSize="5" fontWeight="bold" fontFamily="monospace">PUBMED</text>

                      {/* Node TP53 */}
                      <circle cx="100" cy="100" r="10" fill="#0b0e1e" stroke="#8B5CFF" strokeWidth="1.5" />
                      <motion.circle cx="100" cy="100" r="13" fill="transparent" stroke="#8B5CFF" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2.4 }} />
                      <text x="100" y="102" textAnchor="middle" fill="#8B5CFF" fontSize="5" fontWeight="bold" fontFamily="monospace">TP53</text>
                    </svg>
                  </motion.div>
                )}

                {/* 2. Retrieval Timeline */}
                {activeTab === "timeline" && (
                  <motion.div 
                    key="timeline"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-2 p-1"
                  >
                    {REFERENCES.map((ref, i) => (
                      <div key={i} className="flex gap-3 items-start p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[9px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-1 rounded">{ref.id}</span>
                          <span className="text-[7px] text-[rgba(255,255,255,0.35)] mt-1 font-mono">{ref.source}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-[rgba(255,255,255,0.8)] leading-tight">{ref.text}</p>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-[#00FF99] bg-[#00FF99]/10 px-1.5 py-0.5 rounded">{ref.match}</div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* 3. SHAP Explainability */}
                {activeTab === "shap" && (
                  <motion.div 
                    key="shap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-3 py-1"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[9px] font-mono text-[rgba(255,255,255,0.4)]">
                        <span>FEATURE NAME</span>
                        <span>SHAP ATTRIBUTION (WEIGHT)</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>BRCA1 Overexpression</span>
                            <span className="text-[#FF4FD8] font-bold">+0.48</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#FF4FD8] to-[#FF3CAC]" initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>TP53 Mutation</span>
                            <span className="text-[#8B5CFF] font-bold">+0.32</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#8B5CFF] to-[#6C34FF]" initial={{ width: 0 }} animate={{ width: "55%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>Patient Age (54)</span>
                            <span className="text-[#00E5FF] font-bold">+0.15</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00A1FF]" initial={{ width: 0 }} animate={{ width: "25%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>

      {/* ── BOTOM BAR: INFERENCE RUNTIME LOGGER ── */}
      <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] bg-[#070914]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
          <span className="text-[9px] font-mono text-[rgba(255,255,255,0.3)]">INFERENCE PIPELINE ACTIVE</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] text-white">
          <span className="text-[rgba(255,255,255,0.3)]">&gt;</span>
          <motion.span 
            key={terminalIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#00FF99]"
          >
            {INFERENCE_STEPS[terminalIndex]}
          </motion.span>
        </div>
      </div>

    </div>
  )
}
