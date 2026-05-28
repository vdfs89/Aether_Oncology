"use client"

import { RiskAssessment } from "../../contracts"
import { ConfidenceMeter } from "./ConfidenceMeter"

interface RiskPanelProps {
  assessment: RiskAssessment
  confidenceScore: number
}

export function RiskPanel({ assessment, confidenceScore }: RiskPanelProps) {
  const { level, recommendedAction } = assessment

  const config = {
    LOW: { color: "text-emerald-400", border: "border-emerald-900/50", bg: "bg-emerald-950/20" },
    MODERATE: { color: "text-amber-400", border: "border-amber-900/50", bg: "bg-amber-950/20" },
    HIGH: { color: "text-rose-400", border: "border-rose-900/50", bg: "bg-rose-950/20" },
    REQUIRES_REVIEW: { color: "text-purple-400", border: "border-purple-900/50", bg: "bg-purple-950/20" },
  }

  const { color, border, bg } = config[level] || config.MODERATE

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-xl border ${border} ${bg} shadow-lg`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
            Clinical Risk State
          </h3>
          <div className={`text-2xl font-bold tracking-tight ${color}`}>
            {level.replace("_", " ")}
          </div>
          
          {recommendedAction && (
            <div className="mt-3 flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-400 mt-0.5" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {recommendedAction}
              </span>
            </div>
          )}
        </div>

        <div className="sm:text-right flex flex-col sm:items-end">
          <ConfidenceMeter score={confidenceScore} />
        </div>
      </div>
    </div>
  )
}
