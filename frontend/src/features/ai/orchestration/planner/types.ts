/**
 * src/features/ai/orchestration/planner/types.ts
 *
 * Core type definitions for the Clinical Intelligence Planner.
 *
 * The planner is a 4-layer deterministic pipeline:
 *   Layer 1 — Intent Detection
 *   Layer 2 — Tool Selection
 *   Layer 3 — Dependency Graph Builder
 *   Layer 4 — Clinical Risk Escalation
 */
import { ExecutionPlan } from "../../tools/types"

// ---------------------------------------------------------------------------
// Clinical Intents — what the user is trying to accomplish
// ---------------------------------------------------------------------------

export type ClinicalIntent =
  | "biomarker_analysis"
  | "therapy_matching"
  | "prognosis"
  | "trial_search"
  | "evidence_review"
  | "imaging_analysis"
  | "risk_assessment"
  | "general_inquiry"
  | "unknown"

// ---------------------------------------------------------------------------
// Clinical Risk Levels — determines approval workflow
// ---------------------------------------------------------------------------

export type ClinicalRiskLevel =
  | "LOW"        // informational, no clinical action
  | "MODERATE"   // evidence review, monitoring suggestions
  | "HIGH"       // therapy recommendation, dosage guidance
  | "CRITICAL"   // aggressive treatment, contraindication, life-altering

// ---------------------------------------------------------------------------
// Tool Capability Descriptor — enriches the registry for planner selection
// ---------------------------------------------------------------------------

export interface ToolCapability {
  toolId: string
  riskLevel: ClinicalRiskLevel
  requiresApproval: boolean
  requiresPHI: boolean
  estimatedLatencyMs: number
  cost: "free" | "low" | "medium" | "high"
  dependencies: string[]       // toolIds this tool depends on
  intents: ClinicalIntent[]    // which intents this tool serves
}

// ---------------------------------------------------------------------------
// Planner Result — the output of the planning pipeline
// ---------------------------------------------------------------------------

export interface PlannerResult {
  intent: ClinicalIntent
  confidence: number           // 0.0 – 1.0
  executionPlan: ExecutionPlan
  riskLevel: ClinicalRiskLevel
  requiresApproval: boolean
  reasoning: string[]          // human-readable explanation of planning decisions
  selectedTools: string[]      // toolIds chosen by the planner
  escalationReason?: string    // why risk was elevated, if applicable
}

// ---------------------------------------------------------------------------
// Planner Events — telemetry emitted during the planning pipeline
// ---------------------------------------------------------------------------

export type PlannerEventType =
  | "PlanningStarted"
  | "IntentDetected"
  | "ToolsSelected"
  | "PlanBuilt"
  | "RiskEscalated"
  | "ApprovalRequired"

export interface PlannerEvent {
  type: PlannerEventType
  data: Record<string, unknown>
  timestamp: number
}
