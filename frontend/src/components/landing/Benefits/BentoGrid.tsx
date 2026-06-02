"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { glowHover, glowHoverPink } from "@/animations/glowHover"

export function BentoGrid() {
  const reducedMotion = useReducedMotion()

  const hoverCyan = reducedMotion ? undefined : glowHover.hover
  const hoverPink = reducedMotion ? undefined : glowHoverPink.hover

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
      
      {/* ── CARD 1: EXPLAINABLE AI (XAI) ── */}
      <motion.article 
        whileHover={hoverCyan}
        className="bento-card bento-card--glow-magenta p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]"
        aria-label="Explainable AI"
      >
        <div className="absolute inset-0 z-0 bg-radial-gradient from-[rgba(255,79,216,0.04)] to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(255,79,216,0.08)] border border-[rgba(255,79,216,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4FD8" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Explainable AI (XAI)</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Decisões médicas auditáveis por valores SHAP e counterfactuals. Rastreabilidade completa de cada neurônio ativado.
            </p>
          </div>
        </div>

        {/* Mini SHAP Visualization */}
        <div className="relative z-10 w-full mt-4 bg-[rgba(255,255,255,0.01)] rounded-lg p-3 border border-[rgba(255,255,255,0.03)]">
          <div className="flex justify-between text-[9px] text-[rgba(255,255,255,0.45)] mb-2 font-mono">
            <span>MUTATION SCORE</span>
            <span>SHAP ATTRIBUTION</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[rgba(255,255,255,0.8)]">BRCA1 +</span>
              <span className="text-[#FF4FD8] font-bold">+0.48</span>
            </div>
            <div className="h-1.5 bg-[rgba(255,255,255,0.03)] rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#FF4FD8]" initial={{ width: 0 }} whileInView={{ width: "85%" }} viewport={{ once: true }} transition={{ duration: 1 }} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[rgba(255,255,255,0.8)]">TP53 Mut</span>
              <span className="text-[#00E5FF] font-bold">+0.32</span>
            </div>
            <div className="h-1.5 bg-[rgba(255,255,255,0.03)] rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#00E5FF]" initial={{ width: 0 }} whileInView={{ width: "60%" }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.1 }} />
            </div>
          </div>
        </div>
      </motion.article>

      {/* ── CARD 2: RAG SCIENTIFIC RETRIEVAL ── */}
      <motion.article 
        whileHover={hoverCyan}
        className="bento-card bento-card--glow-cyan p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]"
        aria-label="Scientific RAG"
      >
        <div className="absolute inset-0 z-0 bg-radial-gradient from-[rgba(0,229,255,0.04)] to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">RAG Científico Dinâmico</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Busca vetorial em tempo real no PubMed, ClinVar e diretrizes NCCN com explicabilidade baseada em citações auditáveis.
            </p>
          </div>
        </div>

        {/* Live Vector Nodes Map */}
        <div className="relative z-10 w-full mt-4 flex justify-center bg-[rgba(255,255,255,0.01)] rounded-lg p-2 border border-[rgba(255,255,255,0.03)]">
          <svg className="w-full h-24" viewBox="0 0 150 70">
            {/* Connection lines */}
            <line x1="75" y1="35" x2="25" y2="20" stroke="rgba(0,229,255,0.2)" strokeWidth="1" />
            <line x1="75" y1="35" x2="125" y2="20" stroke="rgba(0,229,255,0.2)" strokeWidth="1" />
            <line x1="75" y1="35" x2="75" y2="60" stroke="rgba(0,229,255,0.2)" strokeWidth="1" />
            
            {/* Pulse points */}
            <circle cx="25" cy="20" r="4" fill="#00E5FF" />
            <circle cx="125" cy="20" r="4" fill="#FF4FD8" />
            <circle cx="75" cy="60" r="4" fill="#8B5CFF" />
            
            <circle cx="75" cy="35" r="7" fill="#fff" />
            <motion.circle cx="75" cy="35" r="10" stroke="#00E5FF" strokeWidth="1" fill="none" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />
            <text x="75" y="38" textAnchor="middle" fill="#050816" fontSize="5" fontWeight="bold">QUERY</text>
            <text x="25" y="12" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="monospace">PubMed</text>
            <text x="125" y="12" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="monospace">ClinVar</text>
          </svg>
        </div>
      </motion.article>

      {/* ── CARD 3: CLINICAL MEMORY ── */}
      <motion.article 
        whileHover={hoverPink}
        className="bento-card bento-card--glow-lavender p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]"
        aria-label="Clinical Memory"
      >
        <div className="absolute inset-0 z-0 bg-radial-gradient from-[rgba(139,92,255,0.04)] to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(139,92,255,0.08)] border border-[rgba(139,92,255,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CFF" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Memória Clínica Segmentada</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Persistência offline-first via IndexedDB criptografada com isolamento de contexto por paciente, garantindo compliance total com privacidade clínica.
            </p>
          </div>
        </div>

        {/* Database replication visualization */}
        <div className="relative z-10 w-full mt-4 bg-[rgba(255,255,255,0.01)] rounded-lg p-3 border border-[rgba(255,255,255,0.03)] font-mono text-[9px] text-[rgba(255,255,255,0.5)]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF99]" />
            <span>IndexedDB Active Connection</span>
          </div>
          <div className="flex flex-col gap-1 text-[8px] bg-[#070914] p-1.5 rounded border border-[rgba(255,255,255,0.05)]">
            <div>&gt; db.store(&quot;conversations&quot;).write()</div>
            <div className="text-[#00FF99]">&gt; [OK] Scoped Patient ID #AET-8832 Encrypted</div>
            <div className="text-white/30">&gt; Syncing session timeline (today, yesterday...)</div>
          </div>
        </div>
      </motion.article>

      {/* ── CARD 4: CLINICAL MODE ORCHESTRATION ── */}
      <motion.article 
        whileHover={hoverCyan}
        className="bento-card p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
        aria-label="Clinical Modes"
      >
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FFA3" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Clinical Modes</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Alterne entre Review, Investigation e Tumor Board. Cada modo ajusta a densidade do layout, profundidade de retrieval e alertas.
            </p>
          </div>
        </div>
        
        {/* Dynamic Mode Switcher Mock */}
        <div className="relative z-10 w-full mt-4 flex items-center justify-between p-2 rounded bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] font-mono text-[9px]">
          <div className="flex gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20">TUMOR BOARD</span>
            <span className="px-1.5 py-0.5 rounded text-[rgba(255,255,255,0.4)]">REVIEW</span>
          </div>
          <span className="text-[rgba(255,255,255,0.3)]">Depth: ULTRA</span>
        </div>
      </motion.article>

      {/* ── CARD 5: HIPAA-COMPLIANT SHIELD ── */}
      <motion.article 
        whileHover={hoverCyan}
        className="bento-card p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
        aria-label="Secure Execution"
      >
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Privacidade e Compliance</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Scrubbing automático de dados sensíveis de pacientes (PHI) na borda, garantindo conformidade com HIPAA, LGPD e regulamentos médicos de dados.
            </p>
          </div>
        </div>

        {/* Live Scrubber simulation */}
        <div className="relative z-10 w-full mt-4 bg-[rgba(0,229,255,0.03)] border border-[rgba(0,229,255,0.12)] p-2 rounded flex justify-between items-center font-mono text-[9px]">
          <div className="flex gap-2 items-center">
            <span className="text-[rgba(255,255,255,0.4)]">INPUT:</span>
            <span className="text-white">Dr. Vasconcelos</span>
          </div>
          <span className="text-[#00E5FF] font-bold">PHI SCRUBBED: [PATIENT-01]</span>
        </div>
      </motion.article>

      {/* ── CARD 6: REAL-TIME INFERENCE LATENCY ── */}
      <motion.article 
        whileHover={hoverPink}
        className="bento-card p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
        aria-label="Real-Time Performance"
      >
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(255,79,216,0.08)] border border-[rgba(255,79,216,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4FD8" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Real-Time Inference</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Inferencia de baixa latência em hardware otimizado, transmitindo tokens e relatórios clínicos via Server-Sent Events (SSE).
            </p>
          </div>
        </div>

        {/* Latency diagram */}
        <div className="relative z-10 w-full mt-4 flex items-center justify-between p-2.5 rounded bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] font-mono text-[9px]">
          <div>
            <div className="text-[rgba(255,255,255,0.4)]">TRANSPORTE</div>
            <div className="text-lg font-black text-white mt-0.5">SSE</div>
          </div>
          <div>
            <div className="text-[rgba(255,255,255,0.4)] text-right">API PROTOCOL</div>
            <div className="text-[#FF4FD8] font-bold mt-0.5 text-right">SSE STREAM</div>
          </div>
        </div>
      </motion.article>

      {/* ── CARD 7: MLOPS INFRASTRUCTURE (WIDE) ── */}
      <motion.article 
        whileHover={hoverPink}
        className="bento-card md:col-span-2 lg:col-span-3 p-6 bg-[rgba(13,15,43,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[340px]"
        aria-label="MLOps Pipeline"
      >
        <div className="absolute inset-0 z-0 bg-radial-gradient from-[rgba(139,92,255,0.03)] to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(139,92,255,0.08)] border border-[rgba(139,92,255,0.2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CFF" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div className="max-w-xl">
            <h3 className="text-base font-bold text-white tracking-tight">Infraestrutura MLOps Enterprise</h3>
            <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
              Pipeline de treinamento contínuo auditável por MLflow, DVC e Evidently AI. Detecção de Model Drift (PSI/KS) e quantização INT8 para otimização extrema de recursos.
            </p>
          </div>
        </div>

        {/* High-Fidelity GPU Node Infrastructure SVG */}
        <div className="relative z-10 w-full mt-6 bg-[rgba(255,255,255,0.01)] rounded-xl p-4 border border-[rgba(255,255,255,0.03)]">
          <div className="flex justify-between items-center text-[10px] text-[rgba(255,255,255,0.4)] mb-3 font-mono">
            <span>CLUSTERS DE INFERÊNCIA & DRIFT LOGS</span>
            <span className="text-[#00FF99] font-bold">ALL PIPELINES ACTIVE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Mini Node 1: GPU Cluster */}
            <div className="p-3 bg-[#050816]/75 rounded-lg border border-[rgba(255,255,255,0.04)]">
              <div className="text-[8px] text-[rgba(255,255,255,0.35)] font-mono">ONNX RUNTIME NODE</div>
              <div className="flex justify-between items-center mt-1.5">
                <span className="font-mono text-white text-[10px]">PyTorch MLP</span>
                <span className="text-[#00FF99] font-mono text-[9px]">CPU</span>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} className="flex-1 h-2 rounded bg-gradient-to-t from-[#8B5CFF]/30 to-[#8B5CFF] block animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>

            {/* Mini Node 2: Pipeline Stage */}
            <div className="p-3 bg-[#050816]/75 rounded-lg border border-[rgba(255,255,255,0.04)]">
              <div className="text-[8px] text-[rgba(255,255,255,0.35)] font-mono">MODEL MONITORING</div>
              <div className="flex justify-between items-center mt-1.5">
                <span className="font-mono text-white text-[10px]">Drift PSI</span>
                <span className="text-[#00FFA3] font-mono text-[9px]">0.02 (Optimal)</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.03)] h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="w-[15%] h-full bg-[#00FFA3]" />
              </div>
            </div>

            {/* Mini Node 3: MLOps Stack */}
            <div className="p-3 bg-[#050816]/75 rounded-lg border border-[rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="text-[8px] text-[rgba(255,255,255,0.35)] font-mono">INTEGRATIONS</div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.7)] font-mono text-[8px] border border-[rgba(255,255,255,0.05)]">MLflow</span>
                <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.7)] font-mono text-[8px] border border-[rgba(255,255,255,0.05)]">DVC</span>
                <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.7)] font-mono text-[8px] border border-[rgba(255,255,255,0.05)]">Optuna</span>
              </div>
            </div>

          </div>
        </div>
      </motion.article>

    </div>
  )
}
