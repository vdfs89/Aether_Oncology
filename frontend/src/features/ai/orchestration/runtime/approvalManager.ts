/**
 * src/features/ai/orchestration/runtime/approvalManager.ts
 *
 * Manages the asynchronous suspension of the runtime pending human (physician) approval.
 */
import { nanoid } from "nanoid"
import { ApprovalDecision, ClinicalRuntimeState } from "./types"
import { ExecutionPlan } from "../../tools/types"
import { ClinicalRiskLevel } from "../planner/types"
import { clinicalEventBus } from "./eventBus"
import { ClinicalExecutionContext } from "./executionContext"

export interface PendingApproval {
  approvalRequestId: string
  plan: ExecutionPlan
  riskLevel: ClinicalRiskLevel
  rationale: string[]
  requestedAt: number
  resolve: (decision: ApprovalDecision) => void
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
        resolve,
        reject
      })
    })
  }

  /**
   * Called by the UI when the physician approves or rejects the plan.
   */
  resolveApproval(
    approvalRequestId: string,
    decision: ApprovalDecision,
    context: ClinicalExecutionContext,
    physicianId: string = "mock-dr-123" // MVP mock
  ) {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) {
      console.warn(`No pending approval found for ID: ${approvalRequestId}`)
      return
    }

    // Dispatch the Resolved event
    clinicalEventBus.publish({
      type: "ClinicalApprovalResolved",
      payload: {
        approvalRequestId,
        decision,
        approvedBy: {
          physicianId,
          timestamp: Date.now()
        }
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    // Resume the runtime
    pending.resolve(decision)
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
