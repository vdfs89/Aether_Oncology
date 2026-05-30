import React, { useEffect, useState } from "react"
import { Shield, Check, X, FileText, Activity } from "lucide-react"
import { clinicalApprovalManager, PendingApproval } from "../../orchestration/runtime/approvalManager"
import { clinicalEventBus } from "../../orchestration/runtime/eventBus"
import {
  physicianSession,
  UnauthenticatedPhysicianError,
} from "../../orchestration/runtime/physicianSession"
import { useAI } from "../../hooks/useAI"
import { ApprovalRiskBadge } from "./ApprovalRiskBadge"
import { ApprovalToolCard } from "./ApprovalToolCard"
import { OverridePanel } from "../override/OverridePanel"
import { ExecutionPlanOverride, ResolvedExecutionPlan, RiskProfile } from "../../orchestration/runtime/types"

export function ClinicalApprovalPanel() {
  const { state } = useAI()
  const activeSessionId = state.activePatientId ? state.sessionsByPatient[state.activePatientId]?.id : null

  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  // Physician override state
  const [pendingOverride, setPendingOverride] = useState<{
    override: ExecutionPlanOverride
    resolvedPlan: ResolvedExecutionPlan
    riskDiff: { before: RiskProfile; after: RiskProfile }
  } | null>(null)

  const isAuthenticated = physicianSession.isAuthenticated

  // Listen to event bus for approval state changes
  useEffect(() => {
    const checkApprovals = () => {
      const approvals = clinicalApprovalManager.getPendingApprovals()
      // For MVP, we just grab the first one (assuming 1 active inference at a time)
      setPendingApproval(approvals.length > 0 ? approvals[0] : null)
    }

    checkApprovals() // Initial check

    const unsubscribeReq = clinicalEventBus.subscribe("ClinicalApprovalRequested", checkApprovals)
    const unsubscribeRes = clinicalEventBus.subscribe("ClinicalApprovalResolved", checkApprovals)

    return () => {
      unsubscribeReq()
      unsubscribeRes()
    }
  }, [])

  if (!pendingApproval) return null

  const buildContext = () => ({
    createEventMetadata: () => ({
      traceId: "ui-trace",
      sessionId: activeSessionId || "",
      patientId: state.activePatientId || "",
      timestamp: Date.now(),
      runtimeState: "WAITING_APPROVAL" as const,
    }),
  })

  const runResolve = async (work: () => Promise<void>) => {
    setResolveError(null)
    setIsApproving(true)
    try {
      await work()
      setPendingOverride(null)
    } catch (err) {
      if (err instanceof UnauthenticatedPhysicianError) {
        setResolveError(err.message)
      } else {
        const message = err instanceof Error ? err.message : String(err)
        setResolveError(`Failed to record decision: ${message}`)
      }
      console.error("[ClinicalApprovalPanel] resolve failed:", err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleApprove = () => {
    void runResolve(() =>
      clinicalApprovalManager.resolveApproval(
        pendingApproval!.approvalRequestId,
        "APPROVED",
        buildContext() as any,
      ),
    )
  }

  const handleApproveWithOverride = () => {
    if (!pendingOverride || !pendingApproval) return
    void runResolve(() =>
      clinicalApprovalManager.resolveWithOverride(
        pendingApproval.approvalRequestId,
        pendingOverride.override,
        buildContext() as any,
      ),
    )
  }

  const handleReject = () => {
    void runResolve(() =>
      clinicalApprovalManager.resolveApproval(
        pendingApproval.approvalRequestId,
        "REJECTED",
        buildContext() as any,
      ),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Clinical Approval Required</h2>
              <div className="text-xs text-zinc-500 font-mono mt-0.5">
                ID: {pendingApproval.approvalRequestId}
              </div>
            </div>
          </div>
          <ApprovalRiskBadge level={pendingApproval.riskLevel} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Rationale Section */}
          <section>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Clinical Rationale
            </h3>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-sm text-zinc-300 space-y-2">
              {pendingApproval.rationale.map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>

          {/* Execution Plan Section */}
          <section>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Proposed Execution Plan
            </h3>
            <div className="space-y-4">
              {pendingApproval.plan.map((stage: any, idx: number) => (
                <ApprovalToolCard key={idx} stageIndex={idx} stage={stage} />
              ))}
            </div>
          </section>          {/* Override Panel */}
          <section>
            <OverridePanel
              approvalRequestId={pendingApproval.approvalRequestId}
              plan={pendingApproval.plan}
              onOverrideReady={(override, resolvedPlan, riskDiff) => {
                setPendingOverride({ override, resolvedPlan, riskDiff })
              }}
            />
          </section>

        </div>

        {/* Auth + error banners */}
        {!isAuthenticated && (
          <div className="px-6 py-3 border-t border-amber-500/20 bg-amber-500/10 text-[12px] text-amber-300 shrink-0">
            Sign in with a valid CRM/NPI before approving or rejecting this plan.
            Clinical decisions cannot be recorded under the demo identity.
          </div>
        )}
        {resolveError && (
          <div className="px-6 py-3 border-t border-red-500/30 bg-red-500/10 text-[12px] text-red-300 shrink-0 flex items-start gap-2">
            <X className="w-4 h-4 mt-px shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={handleReject}
            disabled={isApproving || !isAuthenticated}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5"
          >
            Reject Execution
          </button>

          {/* Approve with Override — only shown if physician set mutations */}
          {pendingOverride && (
            <button
              onClick={handleApproveWithOverride}
              disabled={isApproving || !isAuthenticated}
              className="px-4 py-2 text-sm font-medium text-amber-300 bg-amber-600/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Check className="w-4 h-4" />
              Approve Modified Plan
            </button>
          )}

          <button
            onClick={handleApprove}
            disabled={isApproving || !isAuthenticated}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(217,119,6,0.4)] hover:shadow-[0_0_25px_rgba(217,119,6,0.6)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isApproving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Approve Protocol
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
