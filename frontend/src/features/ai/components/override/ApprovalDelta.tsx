"use client"
/**
 * ApprovalDelta.tsx
 *
 * Visual diff between the ORIGINAL execution plan and the OVERRIDDEN plan.
 * Shows which tools were removed and which remain active.
 */
import React from "react"
import { ExecutionPlan } from "../../tools/types"
import { ResolvedExecutionPlan } from "../../orchestration/runtime/types"
import { CheckCircle2, XCircle } from "lucide-react"

const TOOL_LABELS: Record<string, string> = {
  "biomarker-analysis":      "Biomarker Analysis",
  "therapy-matching":        "Therapy Matching",
  "clinical-guidelines-rag": "Clinical Guidelines RAG",
  "pubmed-search":           "PubMed Evidence Search",
  "risk-assessment":         "Risk Assessment",
  "trial-search":            "Clinical Trials Search",
  "evidence-synthesis":      "Evidence Synthesis",
}

interface ApprovalDeltaProps {
  originalPlan: ExecutionPlan
  resolvedPlan: ResolvedExecutionPlan | null
}

export function ApprovalDelta({ originalPlan, resolvedPlan }: ApprovalDeltaProps) {
  if (!resolvedPlan || !resolvedPlan.override) {
    return (
      <div className="text-xs text-zinc-600 italic text-center py-4">
        No modifications applied. Original plan will execute unchanged.
      </div>
    )
  }

  const removedSet = new Set(resolvedPlan.override.removedTools)
  const allTools = originalPlan.flatMap((stage, i) =>
    stage.tools.map(t => ({ toolId: t.toolId, stageIndex: i }))
  )

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Plan Diff
      </div>
      {allTools.map(({ toolId, stageIndex }) => {
        const isRemoved = removedSet.has(toolId)
        return (
          <div
            key={toolId}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
              ${isRemoved
                ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 line-through opacity-70"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              }
            `}
          >
            {isRemoved
              ? <XCircle className="w-4 h-4 shrink-0" />
              : <CheckCircle2 className="w-4 h-4 shrink-0" />
            }
            <span>{TOOL_LABELS[toolId] ?? toolId}</span>
            <span className="text-[10px] font-mono text-zinc-600 ml-auto">Stage {stageIndex + 1}</span>
          </div>
        )
      })}
    </div>
  )
}
