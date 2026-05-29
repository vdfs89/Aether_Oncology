/**
 * src/features/ai/orchestration/runtime/types.ts
 * 
 * Core type definitions for the Clinical Intelligence Runtime.
 */
import { AIMessage, Citation, InferenceStatus } from "../../types"
import { PredictionResult } from "../../contracts"

export type ClinicalRuntimeState =
  | "IDLE"
  | "HYDRATING"
  | "PLANNING"
  | "RETRIEVING"
  | "EXECUTING"
  | "STREAMING"
  | "WAITING_APPROVAL"
  | "INTERRUPTED"
  | "FAILED"
  | "COMPLETED"

export interface BaseEventMetadata {
  traceId: string
  sessionId: string
  patientId: string
  timestamp: number
  runtimeState: ClinicalRuntimeState
}

export type ApprovalDecision =
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED"
  | "MODIFIED"

// ---------------------------------------------------------------------------
// Physician Override Contracts (Phase 5.5)
// ---------------------------------------------------------------------------

export interface StageReorder {
  from: number
  to: number
}

export interface ExecutionPlanOverride {
  /** ID of the original PendingApproval this override applies to */
  approvalRequestId: string
  /** Tool IDs to exclude from execution */
  removedTools: string[]
  /** Optional stage reorder instructions */
  reorderedStages?: StageReorder[]
  /** Tool IDs to force-run regardless of dependencies */
  forcedTools?: string[]
  /** Physician annotation */
  notes?: string
  /** Physician identity (placeholder for real auth) */
  physicianId: string
  /** ISO timestamp of override decision */
  timestamp: string
}

/**
 * The immutable, audit-safe execution plan that the runtime actually runs.
 * Always derived from: applyOverride(originalPlan, override)
 */
import { ExecutionPlan } from "../../tools/types"

export interface ResolvedExecutionPlan {
  originalPlanStages: ExecutionPlan   // snapshot of the original ExecutionPlan
  resolvedStages: ExecutionPlan       // what will actually execute
  override: ExecutionPlanOverride | null
  resolvedAt: number
  sha256Hash?: string                 // Cryptographic audit verification
}

export interface RiskProfile {
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH"
  evidenceStrength: number    // 0–100
  consensusScore: "VERIFIED" | "PARTIAL" | "FAILED"
  fdaCompliance: "PASS" | "WARNING" | "FAIL"
}

export type ClinicalRuntimeEvent =
  | { type: "MessageCreated"; payload: AIMessage; metadata: BaseEventMetadata }
  | { type: "RetrievalStarted"; payload: { query: string }; metadata: BaseEventMetadata }
  | { type: "CitationAttached"; payload: Citation; metadata: BaseEventMetadata }
  | { type: "ToolExecuted"; payload: { toolId: string; result: any }; metadata: BaseEventMetadata }
  | { type: "PredictionGenerated"; payload: PredictionResult; metadata: BaseEventMetadata }
  | { type: "StreamCompleted"; payload: { totalTokens: number }; metadata: BaseEventMetadata }
  | { type: "InferenceFailed"; payload: { error: string }; metadata: BaseEventMetadata }
  | { type: "StateTransition"; payload: { from: ClinicalRuntimeState; to: ClinicalRuntimeState }; metadata: BaseEventMetadata }
  | { type: "ClinicalApprovalRequested"; payload: { approvalRequestId: string; plan: any; riskLevel: string; rationale: string[] }; metadata: BaseEventMetadata }
  | { type: "ClinicalApprovalResolved"; payload: { approvalRequestId: string; decision: ApprovalDecision; approvedBy?: { physicianId: string; timestamp: number } }; metadata: BaseEventMetadata }
  | { type: "ExecutionPlanOverridden"; payload: { approvalRequestId: string; override: ExecutionPlanOverride; resolvedPlan: ResolvedExecutionPlan }; metadata: BaseEventMetadata }
  | { type: "RiskProfileChanged"; payload: { approvalRequestId: string; before: RiskProfile; after: RiskProfile }; metadata: BaseEventMetadata }
  | { type: "OverrideRequested"; payload: { approvalRequestId: string; requestedChanges: Partial<ExecutionPlanOverride> }; metadata: BaseEventMetadata }
  | { type: "OverrideRejected"; payload: { approvalRequestId: string; reason: string }; metadata: BaseEventMetadata }

export interface ExecutionContext {
  patientId: string
  sessionId: string
  traceId: string
  startedAt: number
  completedAt?: number
  durationMs?: number
  citations: Citation[]
  toolsExecuted: Array<{ toolId: string; result: any }>
  riskState?: string
  telemetry: {
    tokensCount: number
    latencyMs?: number
  }
  metadata: Record<string, any>
}
