"use client"
/**
 * ToolToggle.tsx
 *
 * Single tool row inside the Physician Override editor.
 * Allows the physician to disable or force-run individual clinical tools.
 */
import React from "react"
import { Cpu, AlertTriangle } from "lucide-react"

export interface ToolToggleProps {
  toolId: string
  stageIndex: number
  isRemoved: boolean
  onToggle: (toolId: string, removed: boolean) => void
}

const TOOL_LABELS: Record<string, { label: string; risk: "safe" | "medium" | "critical" }> = {
  "biomarker-analysis":      { label: "Biomarker Analysis",        risk: "safe" },
  "therapy-matching":        { label: "Therapy Matching",           risk: "critical" },
  "clinical-guidelines-rag": { label: "Clinical Guidelines RAG",   risk: "safe" },
  "pubmed-search":           { label: "PubMed Evidence Search",    risk: "safe" },
  "risk-assessment":         { label: "Risk Assessment",           risk: "medium" },
  "trial-search":            { label: "Clinical Trials Search",    risk: "safe" },
  "evidence-synthesis":      { label: "Evidence Synthesis",        risk: "safe" },
}

function getRiskColor(risk: "safe" | "medium" | "critical") {
  return {
    safe: "text-emerald-400 bg-emerald-400/10",
    medium: "text-amber-400 bg-amber-400/10",
    critical: "text-rose-400 bg-rose-400/10",
  }[risk]
}

export function ToolToggle({ toolId, stageIndex, isRemoved, onToggle }: ToolToggleProps) {
  const meta = TOOL_LABELS[toolId] ?? { label: toolId, risk: "safe" as const }
  const riskCls = getRiskColor(meta.risk)

  return (
    <div className={`
      flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all duration-200
      ${isRemoved
        ? "opacity-40 bg-white/[0.01] border-white/5 line-through"
        : "bg-white/[0.04] border-white/10 hover:border-white/20"
      }
    `}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-1.5 rounded-md shrink-0 ${riskCls}`}>
          <Cpu className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-200 truncate">{meta.label}</div>
          <div className="text-[10px] text-zinc-600 font-mono">
            Stage {stageIndex + 1} · {toolId}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {meta.risk === "critical" && !isRemoved && (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        )}
        <button
          onClick={() => onToggle(toolId, !isRemoved)}
          className={`
            relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none
            ${isRemoved ? "bg-zinc-700" : "bg-cyan-600"}
          `}
          aria-label={isRemoved ? "Enable tool" : "Disable tool"}
        >
          <span className={`
            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
            ${isRemoved ? "translate-x-0.5" : "translate-x-5"}
          `} />
        </button>
      </div>
    </div>
  )
}
