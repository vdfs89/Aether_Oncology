"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Citações ILUSTRATIVAS (demo de UI do RAG) — não são estudos reais nem validação do Aether.
const REFERENCES = [
  { id: "DEMO-1", source: "PubMed", text: "[ilustrativo] Fatores de risco para câncer oral: tabaco e álcool.", match: "—" },
  { id: "DEMO-2", source: "Cochrane", text: "[ilustrativo] Revisão sistemática — triagem de lesões orais.", match: "—" },
  { id: "DEMO-3", source: "Semantic Scholar", text: "[ilustrativo] Disparidades regionais na incidência de câncer oral.", match: "—" }
]

// Logs ILUSTRATIVOS do pipeline (demo de UI) — não refletem uma inferência real.
const INFERENCE_STEPS = [
  "Inicializando pipeline de inferência (demo ilustrativa)...",
  "Contexto (exemplo): Idade 58, Tabaco: Sim, Álcool: Sim, País: Brasil...",
  "Pré-processamento: StandardScaler + OneHotEncoder...",
  "Consultando PubMed/Cochrane via RAG (busca ao vivo)...",
  "Citações resolvidas (ilustrativo): DEMO-1 & DEMO-2...",
  "Benchmark k=5: ROC-AUC ≈ 0,50 — sem sinal preditivo real...",
  "Saída ilustrativa de estratificação de risco gerada.",
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
          <span className="text-[10px] tracking-wider text-[rgba(255,255,255,0.4)] font-mono">DEMO · UI ILUSTRATIVA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full bg-[#00FF99] transition-all duration-500 ${pulse ? 'scale-110 shadow-[0_0_8px_#00FF99]' : 'scale-90 opacity-60'}`} />
          <span className="text-[10px] font-bold text-[#00FF99] tracking-wider font-mono">LIVE DEMO</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* ── LADO ESQUERDO: CONTEXT & RISK FACTORS ── */}
        <div className="md:col-span-5 flex flex-col gap-4">

          {/* Card: Perfil (exemplo) */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
            <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-2">PERFIL — EXEMPLO ILUSTRATIVO</div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-white">Paciente (exemplo)</span>
              <span className="font-mono text-[#00E5FF] font-bold">#DEMO</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[10px] text-[rgba(255,255,255,0.5)] font-mono">
              <div>Idade: <span className="text-white">58</span></div>
              <div>Gênero: <span className="text-white">M</span></div>
              <div>Tabaco: <span className="text-white">Sim</span></div>
              <div>Álcool: <span className="text-white">Sim</span></div>
            </div>
          </div>

          {/* Card: Fatores de risco (entrada real do modelo) */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex-1">
            <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-2.5">FATORES DE RISCO (ENTRADA DO MODELO)</div>
            <div className="flex flex-col gap-2">

              <div className="flex items-center justify-between p-2 rounded bg-[rgba(255,79,216,0.05)] border border-[rgba(255,79,216,0.15)]">
                <div>
                  <span className="font-bold text-[#FF4FD8]">Tabaco</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Tobacco_Use — uso atual</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#FF4FD8]/20 text-[#FF4FD8] rounded">FATOR</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[rgba(139,92,255,0.05)] border border-[rgba(139,92,255,0.15)]">
                <div>
                  <span className="font-bold text-[#8B5CFF]">Álcool</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Alcohol_Use — consumo regular</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#8B5CFF]/20 text-[#8B5CFF] rounded">FATOR</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[rgba(0,229,255,0.05)] border border-[rgba(0,229,255,0.15)]">
                <div>
                  <span className="font-bold text-[#00E5FF]">País / Demografia</span>
                  <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">Country · Gender · Socioeconomic_Status</div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded">CONTEXTO</span>
              </div>

            </div>
          </div>

        </div>

        {/* ── LADO DIREITO: INTERACTIVE WORKSPACE ── */}
        <div className="md:col-span-7 flex flex-col gap-4">

          {/* Top row: Model metric & Risk status (illustrative) */}
          <div className="grid grid-cols-2 gap-4">

            <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">ROC-AUC (CV k=5)</div>
                <div className="text-xl font-black text-white font-mono">0.50</div>
                <div className="text-[8px] text-[rgba(255,255,255,0.4)] font-mono">sem sinal real · benchmark</div>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[rgba(255,255,255,0.05)]" stroke="currentColor" strokeWidth="2.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <motion.path
                    className="text-[#9E9E9E]"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="50, 100"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 0.5 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute text-[8px] font-mono text-[rgba(255,255,255,0.6)]">CV</span>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">SAÍDA (EXEMPLO)</div>
                <div className="text-xl font-black text-[#FF3CAC] font-mono">ALTO RISCO</div>
                <div className="text-[8px] text-[rgba(255,255,255,0.4)] font-mono">exemplo ilustrativo de saída</div>
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
                XAI (ILUSTRATIVO)
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

                      {/* Node Tabaco */}
                      <circle cx="35" cy="30" r="10" fill="#0b0e1e" stroke="#FF4FD8" strokeWidth="1.5" />
                      <motion.circle cx="35" cy="30" r="13" fill="transparent" stroke="#FF4FD8" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} />
                      <text x="35" y="32" textAnchor="middle" fill="#FF4FD8" fontSize="5" fontWeight="bold" fontFamily="monospace">TABACO</text>

                      {/* Node PubMed */}
                      <circle cx="165" cy="30" r="10" fill="#0b0e1e" stroke="#00E5FF" strokeWidth="1.5" />
                      <motion.circle cx="165" cy="30" r="13" fill="transparent" stroke="#00E5FF" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2.2 }} />
                      <text x="165" y="32" textAnchor="middle" fill="#00E5FF" fontSize="5" fontWeight="bold" fontFamily="monospace">PUBMED</text>

                      {/* Node Álcool */}
                      <circle cx="100" cy="100" r="10" fill="#0b0e1e" stroke="#8B5CFF" strokeWidth="1.5" />
                      <motion.circle cx="100" cy="100" r="13" fill="transparent" stroke="#8B5CFF" strokeWidth="1" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2.4 }} />
                      <text x="100" y="102" textAnchor="middle" fill="#8B5CFF" fontSize="5" fontWeight="bold" fontFamily="monospace">ÁLCOOL</text>
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

                {/* 3. XAI (illustrative) */}
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
                        <span>FEATURE</span>
                        <span>ATRIBUIÇÃO (ILUSTRATIVA · real ≈ 0)</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>Tobacco_Use</span>
                            <span className="text-[#FF4FD8] font-bold">~0.00</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#FF4FD8] to-[#FF3CAC]" initial={{ width: 0 }} animate={{ width: "6%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>Alcohol_Use</span>
                            <span className="text-[#8B5CFF] font-bold">~0.00</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#8B5CFF] to-[#6C34FF]" initial={{ width: 0 }} animate={{ width: "4%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5 text-[9px] text-[rgba(255,255,255,0.7)] font-mono">
                            <span>Age</span>
                            <span className="text-[#00E5FF] font-bold">~0.00</span>
                          </div>
                          <div className="h-2 w-full bg-[rgba(255,255,255,0.03)] rounded-sm overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00A1FF]" initial={{ width: 0 }} animate={{ width: "3%" }} transition={{ duration: 1 }} />
                          </div>
                        </div>
                      </div>

                      <p className="text-[8px] text-[rgba(255,255,255,0.35)] font-mono mt-1 leading-tight">
                        Atribuição ilustrativa — o benchmark mostra que as features são ~independentes do alvo (MI &lt; 5e-4), então a importância real é desprezível.
                      </p>
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
          <span className="text-[9px] font-mono text-[rgba(255,255,255,0.3)]">INFERENCE PIPELINE (DEMO)</span>
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