"use client"
/**
 * OverridePanel.tsx
 *
 * The main physician DAG editor. Combines ToolToggle, ApprovalDelta, and
 * RiskDiffViewer into a single collapsible governance interface.
 *
 * The physician can:
 *   1. Toggle individual tools on/off
 *   2. See a live diff of what will change
 *   3. See how risk metrics shift before confirming
 */
import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, Edit3, Stethoscope } from "lucide-react"
import { ExecutionPlan } from "../../tools/types"
import { ExecutionPlanOverride, ResolvedExecutionPlan, RiskProfile } from "../../orchestration/runtime/types"
import { applyOverride, computeRiskDiff, getToolsFromPlan } from "../../orchestration/runtime/overrideEngine"
import { ToolToggle } from "./ToolToggle"
import { ApprovalDelta } from "./ApprovalDelta"
import { RiskDiffViewer } from "./RiskDiffViewer"

interface OverridePanelProps {
  approvalRequestId: string
  plan: ExecutionPlan
  onOverrideReady: (override: ExecutionPlanOverride, resolvedPlan: ResolvedExecutionPlan, riskDiff: { before: RiskProfile; after: RiskProfile }) => void
}

export function OverridePanel({ approvalRequestId, plan, onOverrideReady }: OverridePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [removedTools, setRemovedTools] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState("")

  const tools = useMemo(() => getToolsFromPlan(plan), [plan])

  // Derive live override and risk diff
  const { resolvedPlan, riskDiff } = useMemo(() => {
    if (removedTools.size === 0) {
      return {
        resolvedPlan: { originalPlanStages: plan, resolvedStages: plan, override: null, resolvedAt: Date.now() },
        riskDiff: null
      }
    }

    const override: ExecutionPlanOverride = {
      approvalRequestId,
      removedTools: Array.from(removedTools),
      physicianId: "mock-dr-override",
      timestamp: new Date().toISOString(),
      notes: notes || undefined
    }

    const resolved = applyOverride(plan, override)
    const diff = computeRiskDiff(plan, resolved)

    return { resolvedPlan: resolved, riskDiff: diff }
  }, [removedTools, notes, plan, approvalRequestId])

  const handleToggle = (toolId: string, shouldRemove: boolean) => {
    setRemovedTools(prev => {
      const next = new Set(prev)
      shouldRemove ? next.add(toolId) : next.delete(toolId)
      return next
    })
  }

  const handleCommitOverride = () => {
    if (removedTools.size === 0) return

    const override: ExecutionPlanOverride = {
      approvalRequestId,
      removedTools: Array.from(removedTools),
      physicianId: "mock-dr-override",
      timestamp: new Date().toISOString(),
      notes: notes || undefined
    }

    const resolved = applyOverride(plan, override)
    const diff = computeRiskDiff(plan, resolved)
    onOverrideReady(override, resolved, diff)
  }

  const hasChanges = removedTools.size > 0

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-zinc-300">Physician Override</span>
          {hasChanges && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-mono">
              {removedTools.size} removed
            </span>
          )}
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-zinc-500" />
          : <ChevronDown className="w-4 h-4 text-zinc-500" />
        }
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6 bg-black/20">
          
          {/* Tool Toggles */}
          <div>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Execution Tools
            </div>
            <div className="space-y-2">
              {tools.map(({ toolId, stageIndex }) => (
                <ToolToggle
                  key={toolId}
                  toolId={toolId}
                  stageIndex={stageIndex}
                  isRemoved={removedTools.has(toolId)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>

          {/* Risk Diff — only if there are changes */}
          {hasChanges && riskDiff && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Risk Impact
              </div>
              <RiskDiffViewer before={riskDiff.before} after={riskDiff.after} />
            </div>
          )}

          {/* Plan Diff */}
          <ApprovalDelta originalPlan={plan} resolvedPlan={hasChanges ? resolvedPlan : null} />

          {/* Physician Notes */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Clinical Annotation (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Rationale for removing selected tools..."
              rows={2}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Commit Override Button */}
          {hasChanges && (
            <button
              onClick={handleCommitOverride}
              className="w-full py-2.5 text-sm font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-all"
            >
              Apply Override & Approve Modified Plan
            </button>
          )}
        </div>
      )}
    </div>
  )
}
