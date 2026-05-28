/**
 * src/features/ai/tools/types.ts
 * 
 * Defines the contract for Clinical Tools in the Cognitive clinical runtime.
 */
import { ExecutionContext } from "../orchestration/runtime/types"

export interface ClinicalToolResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata: {
    durationMs: number
    source?: string
    confidence?: number
  }
}

export interface ClinicalTool {
  id: string
  name: string
  description: string
  inputSchema: Record<string, any>
  execute(args: any, context: ExecutionContext): Promise<ClinicalToolResult>
}

/**
 * Execution-level options per tool call.
 * Extends what's available at the global runtime level.
 */
export interface ToolExecutionOptions {
  /** Max time in ms before the tool is considered failed. Overrides runtime default. */
  timeoutMs?: number
  /** Max retry attempts on failure. Overrides runtime default. */
  maxRetries?: number
  /** If true, a failure in this tool causes the entire graph/parallel batch to abort. */
  critical?: boolean
  /** Priority value (lower = higher priority). Used for scheduling in constrained execution. */
  priority?: number
  /** Maximum number of concurrent executions when running in parallel. 0 = unlimited. */
  concurrency?: number
}

/**
 * Handle for tracking a single tool execution through its lifecycle.
 */
export interface ToolExecutionHandle {
  executionId: string
  toolId: string
  status: ToolExecutionStatus
  startedAt: number
  completedAt?: number
  error?: string
  critical?: boolean
  priority?: number
  attemptCount?: number
}

export type ToolExecutionStatus = "queued" | "running" | "completed" | "failed"

/**
 * A node in the execution DAG.
 */
export interface GraphNode {
  id: string
  toolId: string
  args: any | ((resolvedData: Record<string, any>) => any)
  /** List of node IDs that must finish before this node executes. */
  dependencies: string[]
  /** If true, failure in this node causes the entire graph to abort. */
  critical?: boolean
  /** Priority value (lower = higher priority). */
  priority?: number
  /** Override timeout for this specific node. */
  timeoutMs?: number
}

/**
 * Aggregate summary of a tool execution session.
 */
export interface ToolExecutionSummary {
  totalExecutions: number
  completed: number
  failed: number
  aborted: number
  totalDurationMs: number
  averageDurationMs: number
  executions: ToolExecutionHandle[]
}