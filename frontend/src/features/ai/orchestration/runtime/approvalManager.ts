/**
 * src/features/ai/orchestration/runtime/approvalManager.ts
 *
 * Manages the asynchronous suspension of the runtime pending human (physician) approval.
 */
import { nanoid } from "nanoid"
import { ApprovalDecision, ClinicalRuntimeState, ExecutionPlanOverride, ResolvedExecutionPlan } from "./types"
import { ExecutionPlan } from "../../tools/types"
import { ClinicalRiskLevel } from "../planner/types"
import { clinicalEventBus } from "./eventBus"
import { ClinicalExecutionContext } from "./executionContext"
import { applyOverride, computeRiskDiff } from "./overrideEngine"

export interface PendingApproval {
  approvalRequestId: string
  plan: ExecutionPlan
  riskLevel: ClinicalRiskLevel
  rationale: string[]
  requestedAt: number
  resolve: (decision: ApprovalDecision, resolvedPlan?: ResolvedExecutionPlan) => void
  reject: (error: Error) => void
}

class ClinicalApprovalManager {
  private pendingApprovals = new Map<string, PendingApproval>()

  /**
   * Called by the runtime orchestrator to pause execution and request human review.
   * Resolves when the physician makes a decision via `resolveApproval`.
   */
  async requestApproval(
    plan: ExecutionPlan,
    riskLevel: ClinicalRiskLevel,
    rationale: string[],
    context: ClinicalExecutionContext
  ): Promise<ApprovalDecision> {
    const approvalRequestId = nanoid()

    // Dispatch the Requested event for auditing / UI
    clinicalEventBus.publish({
      type: "ClinicalApprovalRequested",
      payload: {
        approvalRequestId,
        plan,
        riskLevel,
        rationale
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    return new Promise((resolve, reject) => {
      this.pendingApprovals.set(approvalRequestId, {
        approvalRequestId,
        plan,
        riskLevel,
        rationale,
        requestedAt: Date.now(),
        resolve: resolve as any,
        reject
      })
    })
  }

  /**
   * Called by the UI when the physician approves or rejects without changes.
   */
  resolveApproval(
    approvalRequestId: string,
    decision: ApprovalDecision,
    context: ClinicalExecutionContext,
    physicianId: string = "mock-dr-123"
  ) {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) {
      console.warn(`No pending approval found for ID: ${approvalRequestId}`)
      return
    }

    clinicalEventBus.publish({
      type: "ClinicalApprovalResolved",
      payload: {
        approvalRequestId,
        decision,
        approvedBy: { physicianId, timestamp: Date.now() }
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    // Pass straight through — no override
    const resolved = applyOverride(pending.plan, null)
    pending.resolve(decision, resolved)
    this.pendingApprovals.delete(approvalRequestId)
  }

  /**
   * Called by the UI when the physician approves WITH mutations (Phase 5.5).
   * Emits governance events before resuming the runtime.
   */
  resolveWithOverride(
    approvalRequestId: string,
    override: ExecutionPlanOverride,
    context: ClinicalExecutionContext
  ) {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) {
      console.warn(`No pending approval found for ID: ${approvalRequestId}`)
      return
    }

    // Build the immutable resolved plan
    const resolvedPlan = applyOverride(pending.plan, override)
    const { before, after } = computeRiskDiff(pending.plan, resolvedPlan)

    // Emit audit events
    clinicalEventBus.publish({
      type: "ExecutionPlanOverridden",
      payload: { approvalRequestId, override, resolvedPlan },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    clinicalEventBus.publish({
      type: "RiskProfileChanged",
      payload: { approvalRequestId, before, after },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    clinicalEventBus.publish({
      type: "ClinicalApprovalResolved",
      payload: {
        approvalRequestId,
        decision: "MODIFIED",
        approvedBy: { physicianId: override.physicianId, timestamp: Date.now() }
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    pending.resolve("MODIFIED", resolvedPlan)
    this.pendingApprovals.delete(approvalRequestId)
  }

  /**
   * Retrieves the currently pending approval for a given session (if any).
   * Useful for UI hydration.
   */
  getPendingApprovals(): PendingApproval[] {
    return Array.from(this.pendingApprovals.values())
  }
}

export const clinicalApprovalManager = new ClinicalApprovalManager()
