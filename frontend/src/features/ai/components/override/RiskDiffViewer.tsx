"use client"
/**
 * RiskDiffViewer.tsx
 *
 * Displays a before/after comparison table of clinical risk metrics
 * that result from the physician's execution plan mutations.
 */
import React from "react"
import { RiskProfile } from "../../orchestration/runtime/types"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"

interface RiskDiffViewerProps {
  before: RiskProfile
  after: RiskProfile
}

type DeltaDir = "improved" | "degraded" | "unchanged"

function getDeltaDir(metric: keyof RiskProfile, before: RiskProfile, after: RiskProfile): DeltaDir {
  if (metric === "evidenceStrength") {
    const delta = (after.evidenceStrength as number) - (before.evidenceStrength as number)
    return delta > 0 ? "improved" : delta < 0 ? "degraded" : "unchanged"
  }
  if (metric === "hallucinationRisk") {
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2 }
    const b = order[before.hallucinationRisk as keyof typeof order]
    const a = order[after.hallucinationRisk as keyof typeof order]
    return a < b ? "improved" : a > b ? "degraded" : "unchanged"
  }
  if (metric === "consensusScore") {
    const order = { VERIFIED: 0, PARTIAL: 1, FAILED: 2 }
    const b = order[before.consensusScore as keyof typeof order]
    const a = order[after.consensusScore as keyof typeof order]
    return a < b ? "improved" : a > b ? "degraded" : "unchanged"
  }
  if (metric === "fdaCompliance") {
    const order = { PASS: 0, WARNING: 1, FAIL: 2 }
    const b = order[before.fdaCompliance as keyof typeof order]
    const a = order[after.fdaCompliance as keyof typeof order]
    return a < b ? "improved" : a > b ? "degraded" : "unchanged"
  }
  return "unchanged"
}

function DeltaIcon({ dir }: { dir: DeltaDir }) {
  if (dir === "improved") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  if (dir === "degraded") return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
  return <Minus className="w-3.5 h-3.5 text-zinc-600" />
}

function CellValue({ value, metric, which, before, after }: {
  value: string | number
  metric: keyof RiskProfile
  which: "before" | "after"
  before: RiskProfile
  after: RiskProfile
}) {
  const dir = getDeltaDir(metric, before, after)
  const isAfter = which === "after"
  const cls = isAfter
    ? dir === "degraded" ? "text-rose-400"
    : dir === "improved" ? "text-emerald-400"
    : "text-zinc-300"
    : "text-zinc-500"

  return (
    <span className={`font-mono text-sm font-semibold ${cls}`}>
      {metric === "evidenceStrength" ? `${value}%` : value}
    </span>
  )
}

export function RiskDiffViewer({ before, after }: RiskDiffViewerProps) {
  const rows: Array<{ label: string; metric: keyof RiskProfile }> = [
    { label: "Hallucination Risk", metric: "hallucinationRisk" },
    { label: "Evidence Strength",  metric: "evidenceStrength" },
    { label: "Consensus Score",    metric: "consensusScore" },
    { label: "FDA Compliance",     metric: "fdaCompliance" },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="grid grid-cols-4 gap-0 bg-white/[0.03] border-b border-white/10 px-4 py-2">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider col-span-2">Metric</span>
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Before</span>
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center">After</span>
      </div>

      {/* Rows */}
      {rows.map(({ label, metric }) => {
        const dir = getDeltaDir(metric, before, after)
        return (
          <div
            key={metric}
            className={`grid grid-cols-4 gap-0 px-4 py-3 border-b border-white/5 last:border-b-0 transition-colors
              ${dir === "degraded" ? "bg-rose-500/[0.04]" : ""}
              ${dir === "improved" ? "bg-emerald-500/[0.04]" : ""}
            `}
          >
            <div className="col-span-2 flex items-center gap-2">
              <DeltaIcon dir={dir} />
              <span className="text-xs text-zinc-400">{label}</span>
            </div>
            <div className="flex items-center justify-center">
              <CellValue value={before[metric] as any} metric={metric} which="before" before={before} after={after} />
            </div>
            <div className="flex items-center justify-center">
              <CellValue value={after[metric] as any} metric={metric} which="after" before={before} after={after} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
