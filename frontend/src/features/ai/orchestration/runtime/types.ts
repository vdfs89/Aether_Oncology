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
