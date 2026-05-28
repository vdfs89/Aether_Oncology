/**
 * src/features/ai/tools/types.ts
 *
 * Defines contracts for Clinical Tools, execution handles,
 * result envelopes, and dependency metadata for the Tool Runtime Engine.
 */
import { ExecutionContext } from "../orchestration/runtime/types"

// ---------------------------------------------------------------------------
// Tool Result Contract
// ---------------------------------------------------------------------------

export interface ClinicalToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata: {
    durationMs: number
    source?: string
    confidence?: number
  }
}

// ---------------------------------------------------------------------------
// Execution Handle (tracking a single tool run)
// ---------------------------------------------------------------------------

export type ToolExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "cancelled"

export interface ToolExecutionHandle {
  executionId: string
  toolId: string
  status: ToolExecutionStatus
  args: unknown
  startedAt: number
  completedAt?: number
  durationMs?: number
  result?: ClinicalToolResult
  retryCount: number
  error?: string
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export interface ToolPolicy {
  timeoutMs: number
  maxRetries: number
  critical: boolean            // if true, failure aborts the entire execution graph
}

const DEFAULT_TOOL_POLICY: ToolPolicy = {
  timeoutMs: 8000,
  maxRetries: 3,
  critical: false
}

export { DEFAULT_TOOL_POLICY }

export interface ClinicalTool {
  id: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  policy?: ToolPolicy
  execute(args: any, context: ExecutionContext): Promise<any>
}

// ---------------------------------------------------------------------------
// Execution Graph — DAG of tool stages
// ---------------------------------------------------------------------------

export interface ExecutionStage {
  /** Tools in this stage run in parallel */
  tools: Array<{ toolId: string; args: unknown }>
}

/**
 * An ExecutionPlan is an ordered list of stages.
 * Each stage's tools run in parallel; stages run sequentially.
 */
export type ExecutionPlan = ExecutionStage[]
