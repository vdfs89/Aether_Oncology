import React, { useEffect, useState } from "react"
import { Cpu, AlertTriangle } from "lucide-react"
import { clinicalEventBus } from "../../orchestration/runtime/eventBus"

interface SafetyMetrics {
  safetyScore: number
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH"
  consensus: "PASSED" | "FAILED" | "PENDING"
  evidenceStrength: "LOW" | "MODERATE" | "HIGH" | "PENDING"
  judgeProvider: "OpenAI" | "Pending"
  requiresReview: boolean
}

export const ClinicalSafetyHUD: React.FC = () => {
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null)
  const [isJudging, setIsJudging] = useState(false)

  useEffect(() => {
    const unsubStarted = clinicalEventBus.subscribe("judgement_started" as any, () => {
      setIsJudging(true)
      setMetrics({
        safetyScore: 0,
        hallucinationRisk: "LOW",
        consensus: "PENDING",
        evidenceStrength: "PENDING",
        judgeProvider: "Pending",
        requiresReview: false
      })
    })

    const unsubCompleted = clinicalEventBus.subscribe("judgement_completed" as any, (event: any) => {
      setIsJudging(false)
      const j = (event as any)?.judgement
      if (j) {
        setMetrics({
          safetyScore: j.confidence ? Math.round(j.confidence * 100) : 0,
          hallucinationRisk: j.hallucination_risk || "LOW",
          consensus: j.contradictions?.length > 0 ? "FAILED" : "PASSED",
          evidenceStrength: j.evidence_strength || "LOW",
          judgeProvider: "OpenAI",
          requiresReview: j.requires_physician_review || false
        })
      }
    })

    return () => {
      unsubStarted()
      unsubCompleted()
    }
  }, [])

  if (!metrics && !isJudging) return null

  return (
    <div className="flex flex-col space-y-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs font-mono">
      <div className="flex items-center justify-between text-zinc-400 mb-1">
        <span className="uppercase tracking-wider font-semibold">Clinical Safety HUD</span>
        {isJudging && <span className="animate-pulse text-amber-500">Evaluating...</span>}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Score:</span>
            <span className={metrics.safetyScore >= 90 ? "text-emerald-400" : "text-amber-400"}>
              {metrics.safetyScore}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Hallucination:</span>
            <span className={metrics.hallucinationRisk === "LOW" ? "text-emerald-400" : "text-rose-400"}>
              {metrics.hallucinationRisk}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Consensus:</span>
            <span className={metrics.consensus === "PASSED" ? "text-emerald-400" : "text-rose-400"}>
              {metrics.consensus}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Evidence:</span>
            <span className={metrics.evidenceStrength === "HIGH" ? "text-emerald-400" : "text-amber-400"}>
              {metrics.evidenceStrength}
            </span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-zinc-500">Judge:</span>
            <span className="text-blue-400">{metrics.judgeProvider}</span>
          </div>
          {metrics.requiresReview && (
            <div className="col-span-2 mt-2 px-2 py-1 bg-rose-500/20 text-rose-400 text-center rounded">
              Requires Physician Review
            </div>
          )}
        </div>
      )}
    </div>
  )
}
