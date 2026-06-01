/**
 * src/features/ai/orchestration/runtime/approvalManager.ts
 *
 * Clinical Approval Manager — P0 Governance Layer.
 *
 * Manages asynchronous suspension of the runtime pending physician review.
 *
 * P0 Upgrades (Phase 5.6 governance hardening):
 *   - Real physicianId from PhysicianSession (not hardcoded mock)
 *   - Approval timeout (APPROVAL_TIMEOUT_MS) with automatic REJECTED escalation
 *   - Persistent approval state via backend SQLite table and sessionStorage
 *   - Automatic timeout warnings and lifecycle management
 */
import { nanoid } from "nanoid"
import {
  ApprovalDecision,
  ExecutionPlanOverride,
  ResolvedExecutionPlan
} from "./types"
import { ExecutionPlan } from "../../tools/types"
import { ClinicalRiskLevel } from "../planner/types"
import { clinicalEventBus } from "./eventBus"
import { ClinicalExecutionContext } from "./executionContext"
import { applyOverride, computeRiskDiff } from "./overrideEngine"
import { physicianSession } from "./physicianSession"
import type { ApprovalDecision as ApprovalDecisionType } from "./types"

const SYSTEM_TIMEOUT_ID = "SYSTEM_TIMEOUT"

/** Clinical approval timeout — 15 minutes by default, 5 for CRITICAL risk */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000
const CRITICAL_TIMEOUT_MS = 5 * 60 * 1000

/** Warning is emitted at 80% of the timeout window */
const TIMEOUT_WARNING_THRESHOLD = 0.80

const PERSISTENCE_KEY = "aether:pending_approvals"

export interface PendingApproval {
  approvalRequestId: string
  plan: ExecutionPlan
  riskLevel: ClinicalRiskLevel
  rationale: string[]
  requestedAt: number
  /** Absolute timestamp when the approval expires */
  expiresAt: number
  resolve: (decision: ApprovalDecision, resolvedPlan?: ResolvedExecutionPlan) => void
  reject: (error: Error) => void
}

/** Serializable subset stored in sessionStorage and backend database */
interface PersistedApproval {
  approvalRequestId: string
  plan: ExecutionPlan
  riskLevel: ClinicalRiskLevel
  rationale: string[]
  requestedAt: number
  expiresAt: number
}

class ApprovalRepository {
  private getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_URL ?? "https://api.vitorsilva.engineer"
  }

  async save(approval: PersistedApproval): Promise<void> {
    try {
      await fetch(`${this.getBaseUrl()}/api/v1/clinical/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approval)
      })
    } catch (e) {
      console.error("[ApprovalRepository] Failed to save approval to backend:", e)
    }
  }

  async findById(approvalRequestId: string): Promise<PersistedApproval | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/clinical/approvals/${approvalRequestId}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  async delete(approvalRequestId: string): Promise<void> {
    try {
      await fetch(`${this.getBaseUrl()}/api/v1/clinical/approvals/${approvalRequestId}`, {
        method: "DELETE"
      })
    } catch (e) {
      console.error("[ApprovalRepository] Failed to delete approval from backend:", e)
    }
  }

  async listAll(): Promise<PersistedApproval[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/clinical/approvals`)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }

  /**
   * Resolve an approval server-side. The backend enforces:
   *   - 403 if physician_id is the fallback sentinel
   *   - 408 if the approval window expired
   *   - 409 if already resolved or concurrently modified
   * Returns the HTTP status so callers can branch on 408 → SYSTEM_TIMEOUT.
   */
  async resolve(
    approvalRequestId: string,
    decision: ApprovalDecisionType,
    physicianId: string
  ): Promise<{ ok: boolean; status: number }> {
    try {
      const res = await fetch(
        `${this.getBaseUrl()}/api/v1/clinical/approvals/${approvalRequestId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, physician_id: physicianId })
        }
      )
      return { ok: res.ok, status: res.status }
    } catch (e) {
      console.error("[ApprovalRepository] Failed to resolve approval:", e)
      return { ok: false, status: 0 }
    }
  }
}

class ClinicalApprovalManager {
  private pendingApprovals = new Map<string, PendingApproval>()
  private timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>()
  private warningHandles = new Map<string, ReturnType<typeof setTimeout>>()
  private repository = new ApprovalRepository()

  constructor() {
    if (typeof window !== "undefined") {
      this.hydrate()
    }
  }

  /** Reloads active approvals from the backend database on page load/reset */
  async hydrate() {
    try {
      const activeApprovals = await this.repository.listAll()
      for (const app of activeApprovals) {
        if (app.expiresAt > Date.now()) {
          this.pendingApprovals.set(app.approvalRequestId, {
            ...app,
            resolve: async (decision, resolvedPlan) => {
              console.info(`Hydrated approval resolved: ${app.approvalRequestId} -> ${decision}`)
              await this.repository.delete(app.approvalRequestId)
            },
            reject: async (err) => {
              console.warn(`Hydrated approval rejected: ${app.approvalRequestId}`, err)
              await this.repository.delete(app.approvalRequestId)
            }
          })
          const remainingMs = app.expiresAt - Date.now()
          this._scheduleHydratedTimeout(app.approvalRequestId, remainingMs)
        } else {
          // Cleanup already expired approvals
          await this.repository.delete(app.approvalRequestId)
        }
      }
      this._persistState()
    } catch (e) {
      console.error("[ApprovalManager] Failed to hydrate pending approvals:", e)
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Called by the runtime orchestrator to pause execution and request physician review.
   * Resolves when the physician makes a decision, or rejects on timeout.
   */
  async requestApproval(
    plan: ExecutionPlan,
    riskLevel: ClinicalRiskLevel,
    rationale: string[],
    context: ClinicalExecutionContext
  ): Promise<ApprovalDecision> {
    const approvalRequestId = nanoid()
    const timeoutMs = riskLevel === "CRITICAL" ? CRITICAL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
    const expiresAt = Date.now() + timeoutMs

    clinicalEventBus.publish({
      type: "ClinicalApprovalRequested",
      payload: { approvalRequestId, plan, riskLevel, rationale },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    const persisted: PersistedApproval = {
      approvalRequestId,
      plan,
      riskLevel,
      rationale,
      requestedAt: Date.now(),
      expiresAt
    }

    await this.repository.save(persisted)

    return new Promise((resolve, reject) => {
      const pending: PendingApproval = {
        ...persisted,
        resolve: async (decision, resolvedPlan) => {
          resolve(decision)
          await this.repository.delete(approvalRequestId)
        },
        reject: async (error) => {
          reject(error)
          await this.repository.delete(approvalRequestId)
        }
      }

      this.pendingApprovals.set(approvalRequestId, pending)
      this._persistState()
      this._scheduleTimeout(approvalRequestId, timeoutMs, context)
      this._scheduleWarning(approvalRequestId, timeoutMs, context)
    })
  }

  /**
   * Standard physician decision — Approve or Reject without mutations.
   *
   * Fix #2: requires an authenticated physician (throws otherwise).
   * Fix #3: server-side resolve enforces the timeout window — a 408 response
   * is translated into a SYSTEM_TIMEOUT REJECTED audit event so the trail
   * stays consistent with the client-side timer path.
   */
  async resolveApproval(
    approvalRequestId: string,
    decision: ApprovalDecision,
    context: ClinicalExecutionContext
  ): Promise<void> {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) {
      console.warn(`[ApprovalManager] No pending approval: ${approvalRequestId}`)
      return
    }

    const physician = physicianSession.requireAuthenticatedPhysician(
      `resolveApproval(${decision})`
    )

    const serverResult = await this.repository.resolve(
      approvalRequestId,
      decision,
      physician.physicianId
    )

    if (serverResult.status === 408) {
      // Server expired the approval before the physician acted. Audit-parity
      // with the client-side _scheduleTimeout path: emit a REJECTED resolution
      // attributed to SYSTEM_TIMEOUT and reject the pending promise.
      clinicalEventBus.publish({
        type: "ClinicalApprovalResolved",
        payload: {
          approvalRequestId,
          decision: "REJECTED",
          approvedBy: { physicianId: SYSTEM_TIMEOUT_ID, timestamp: Date.now() }
        },
        metadata: context.createEventMetadata("WAITING_APPROVAL")
      })
      this._clearTimers(approvalRequestId)
      pending.reject(
        new Error(
          `Server enforced approval timeout for ${approvalRequestId} (HTTP 408)`
        )
      )
      this.pendingApprovals.delete(approvalRequestId)
      this._persistState()
      return
    }

    if (!serverResult.ok) {
      throw new Error(
        `Failed to resolve approval ${approvalRequestId}: HTTP ${serverResult.status}`
      )
    }

    clinicalEventBus.publish({
      type: "ClinicalApprovalResolved",
      payload: {
        approvalRequestId,
        decision,
        approvedBy: {
          physicianId: physician.physicianId,
          timestamp: Date.now()
        }
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    this._clearTimers(approvalRequestId)
    const resolved = applyOverride(pending.plan, null)
    pending.resolve(decision, resolved)
    this.pendingApprovals.delete(approvalRequestId)
    this._persistState()
  }

  /**
   * Physician approves WITH mutations — Phase 5.5 Physician Override.
   * Emits full governance audit trail before resuming the runtime.
   *
   * Fix #2: requires an authenticated physician.
   * Fix #3: hits the server resolve endpoint with decision=MODIFIED; 408
   * translates to a SYSTEM_TIMEOUT REJECTED event (override discarded).
   */
  async resolveWithOverride(
    approvalRequestId: string,
    override: ExecutionPlanOverride,
    context: ClinicalExecutionContext
  ): Promise<void> {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) {
      console.warn(`[ApprovalManager] No pending approval: ${approvalRequestId}`)
      return
    }

    const physician = physicianSession.requireAuthenticatedPhysician(
      "resolveWithOverride(MODIFIED)"
    )
    const auditedOverride: ExecutionPlanOverride = {
      ...override,
      physicianId: physician.physicianId,
      timestamp: new Date().toISOString()
    }

    const serverResult = await this.repository.resolve(
      approvalRequestId,
      "MODIFIED",
      physician.physicianId
    )

    if (serverResult.status === 408) {
      clinicalEventBus.publish({
        type: "ClinicalApprovalResolved",
        payload: {
          approvalRequestId,
          decision: "REJECTED",
          approvedBy: { physicianId: SYSTEM_TIMEOUT_ID, timestamp: Date.now() }
        },
        metadata: context.createEventMetadata("WAITING_APPROVAL")
      })
      this._clearTimers(approvalRequestId)
      pending.reject(
        new Error(
          `Server enforced approval timeout for ${approvalRequestId} (HTTP 408)`
        )
      )
      this.pendingApprovals.delete(approvalRequestId)
      this._persistState()
      return
    }

    if (!serverResult.ok) {
      throw new Error(
        `Failed to resolve approval with override ${approvalRequestId}: HTTP ${serverResult.status}`
      )
    }

    const resolvedPlan = applyOverride(pending.plan, auditedOverride)
    const { before, after } = computeRiskDiff(pending.plan, resolvedPlan)

    clinicalEventBus.publish({
      type: "ExecutionPlanOverridden",
      payload: { approvalRequestId, override: auditedOverride, resolvedPlan },
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
        approvedBy: {
          physicianId: physician.physicianId,
          timestamp: Date.now()
        }
      },
      metadata: context.createEventMetadata("WAITING_APPROVAL")
    })

    this._clearTimers(approvalRequestId)
    pending.resolve("MODIFIED", resolvedPlan)
    this.pendingApprovals.delete(approvalRequestId)
    this._persistState()
  }

  /** Returns all currently pending approvals (for UI hydration). */
  getPendingApprovals(): PendingApproval[] {
    return Array.from(this.pendingApprovals.values())
  }

  /** Returns the time remaining (ms) for an approval, or 0 if expired. */
  getTimeRemaining(approvalRequestId: string): number {
    const pending = this.pendingApprovals.get(approvalRequestId)
    if (!pending) return 0
    return Math.max(0, pending.expiresAt - Date.now())
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private _scheduleTimeout(
    approvalRequestId: string,
    timeoutMs: number,
    context: ClinicalExecutionContext
  ) {
    const handle = setTimeout(async () => {
      const pending = this.pendingApprovals.get(approvalRequestId)
      if (!pending) return

      console.warn(`[ApprovalManager] Timeout — approval ${approvalRequestId} expired after ${timeoutMs}ms`)

      clinicalEventBus.publish({
        type: "ClinicalApprovalResolved",
        payload: {
          approvalRequestId,
          decision: "REJECTED",
          approvedBy: {
            physicianId: "SYSTEM_TIMEOUT",
            timestamp: Date.now()
          }
        },
        metadata: context.createEventMetadata("WAITING_APPROVAL")
      })

      pending.reject(
        new Error(`Clinical approval timeout — no physician response within ${timeoutMs / 60000} minutes`)
      )
      this.pendingApprovals.delete(approvalRequestId)
      await this.repository.delete(approvalRequestId)
      this._persistState()
      this.timeoutHandles.delete(approvalRequestId)
      this.warningHandles.delete(approvalRequestId)
    }, timeoutMs)

    this.timeoutHandles.set(approvalRequestId, handle)
  }

  private _scheduleHydratedTimeout(approvalRequestId: string, timeoutMs: number) {
    const handle = setTimeout(async () => {
      const pending = this.pendingApprovals.get(approvalRequestId)
      if (!pending) return

      console.warn(`[ApprovalManager] Timeout — hydrated approval ${approvalRequestId} expired`)
      this.pendingApprovals.delete(approvalRequestId)
      await this.repository.delete(approvalRequestId)
      this._persistState()
      this.timeoutHandles.delete(approvalRequestId)
    }, timeoutMs)

    this.timeoutHandles.set(approvalRequestId, handle)
  }

  private _scheduleWarning(
    approvalRequestId: string,
    timeoutMs: number,
    context: ClinicalExecutionContext
  ) {
    const warningMs = timeoutMs * TIMEOUT_WARNING_THRESHOLD

    const handle = setTimeout(() => {
      const pending = this.pendingApprovals.get(approvalRequestId)
      if (!pending) return

      const remainingMs = pending.expiresAt - Date.now()
      clinicalEventBus.publish({
        type: "StateTransition",
        payload: {
          from: "WAITING_APPROVAL",
          to: "WAITING_APPROVAL"
        },
        metadata: {
          ...context.createEventMetadata("WAITING_APPROVAL"),
        }
      })

      console.warn(
        `[ApprovalManager] Timeout warning — ${Math.round(remainingMs / 1000)}s remaining for ${approvalRequestId}`
      )
    }, warningMs)

    this.warningHandles.set(approvalRequestId, handle)
  }

  private _clearTimers(approvalRequestId: string) {
    const timeout = this.timeoutHandles.get(approvalRequestId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeoutHandles.delete(approvalRequestId)
    }
    const warning = this.warningHandles.get(approvalRequestId)
    if (warning) {
      clearTimeout(warning)
      this.warningHandles.delete(approvalRequestId)
    }
  }

  /** Persist serializable approval state for page-refresh resilience */
  private _persistState() {
    try {
      const serializable: PersistedApproval[] = Array.from(this.pendingApprovals.values()).map(p => ({
        approvalRequestId: p.approvalRequestId,
        plan: p.plan,
        riskLevel: p.riskLevel,
        rationale: p.rationale,
        requestedAt: p.requestedAt,
        expiresAt: p.expiresAt
      }))
      sessionStorage.setItem(PERSISTENCE_KEY, JSON.stringify(serializable))
    } catch {
      // Non-critical — in-memory state is still correct
    }
  }
}

export const clinicalApprovalManager = new ClinicalApprovalManager()
