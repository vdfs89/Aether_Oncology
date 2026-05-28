/**
 * src/features/ai/tools/runtime.ts
 *
 * Clinical Tool Runtime Engine
 *
 * Manages tool execution lifecycles with:
 *   - Parallel & sequential stage execution (execution graph / DAG)
 *   - Per-tool timeout enforcement
 *   - Automatic retries with exponential backoff
 *   - Abort signal propagation for cancellation
 *   - Full telemetry emission via ClinicalEventBus
 *   - Standardized ClinicalToolResult envelopes
 */
import { nanoid } from "nanoid"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { ExecutionContext, BaseEventMetadata, ClinicalRuntimeState } from "../orchestration/runtime/types"
import {
  ClinicalTool,
  ClinicalToolResult,
  ToolExecutionHandle,
  ToolExecutionStatus,
  ToolPolicy,
  DEFAULT_TOOL_POLICY,
  ExecutionPlan
} from "./types"
import { toolRegistry } from "./registry"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMetadata(
  context: ExecutionContext,
  runtimeState: ClinicalRuntimeState
): BaseEventMetadata {
  return {
    traceId: context.traceId,
    sessionId: context.sessionId,
    patientId: context.patientId,
    timestamp: Date.now(),
    runtimeState
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wraps a promise with a timeout. Rejects with a descriptive error
 * if the promise does not settle within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`TOOL_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
    promise.then(
      val => { clearTimeout(timer); resolve(val) },
      err => { clearTimeout(timer); reject(err) }
    )
  })
}

// ---------------------------------------------------------------------------
// Clinical Tool Runtime
// ---------------------------------------------------------------------------

export class ClinicalToolRuntime {
  private executions: Map<string, ToolExecutionHandle> = new Map()

  // -------------------------------------------------------------------------
  // Single tool execution with retries, timeout, and telemetry
  // -------------------------------------------------------------------------

  async execute(
    toolId: string,
    args: unknown,
    context: ExecutionContext,
    signal?: AbortSignal
  ): Promise<ClinicalToolResult> {
    const tool = toolRegistry[toolId]
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolId}" not found in registry`,
        metadata: { durationMs: 0 }
      }
    }

    const policy: ToolPolicy = { ...DEFAULT_TOOL_POLICY, ...tool.policy }
    const executionId = nanoid()
    const handle: ToolExecutionHandle = {
      executionId,
      toolId,
      status: "queued",
      args,
      startedAt: Date.now(),
      retryCount: 0
    }
    this.executions.set(executionId, handle)

    // Publish ToolStarted
    clinicalEventBus.publish({
      type: "ToolExecuted",
      payload: { toolId, result: { phase: "started", executionId } },
      metadata: createMetadata(context, "EXECUTING")
    })

    let lastError: string = ""

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      // Check abort
      if (signal?.aborted) {
        handle.status = "cancelled"
        handle.completedAt = Date.now()
        handle.durationMs = handle.completedAt - handle.startedAt
        handle.error = "Aborted by user"
        this.executions.set(executionId, handle)
        return {
          success: false,
          error: "Aborted by user",
          metadata: { durationMs: handle.durationMs }
        }
      }

      handle.status = "running"
      handle.retryCount = attempt
      this.executions.set(executionId, handle)

      try {
        const rawResult = await withTimeout(
          tool.execute(args, context),
          policy.timeoutMs,
          tool.name
        )

        // Success
        handle.status = "completed"
        handle.completedAt = Date.now()
        handle.durationMs = handle.completedAt - handle.startedAt

        const result: ClinicalToolResult = {
          success: true,
          data: rawResult,
          metadata: {
            durationMs: handle.durationMs,
            source: tool.id,
            confidence: rawResult?.confidence
          }
        }

        handle.result = result
        this.executions.set(executionId, handle)

        return result

      } catch (err: any) {
        lastError = err.message || String(err)

        const isTimeout = lastError.startsWith("TOOL_TIMEOUT")
        if (isTimeout) {
          handle.status = "timeout"
        } else {
          handle.status = "failed"
        }

        // If we have more retries, wait with exponential backoff
        if (attempt < policy.maxRetries) {
          const backoffMs = Math.min(200 * Math.pow(2, attempt), 2000)
          await wait(backoffMs)
        }
      }
    }

    // All retries exhausted
    handle.status = "failed"
    handle.completedAt = Date.now()
    handle.durationMs = handle.completedAt - handle.startedAt
    handle.error = lastError

    const failedResult: ClinicalToolResult = {
      success: false,
      error: lastError,
      metadata: {
        durationMs: handle.durationMs ?? 0,
        source: tool.id
      }
    }
    handle.result = failedResult
    this.executions.set(executionId, handle)

    return failedResult
  }

  // -------------------------------------------------------------------------
  // Parallel execution of multiple tools within a single stage
  // -------------------------------------------------------------------------

  async executeParallel(
    calls: Array<{ toolId: string; args: unknown }>,
    context: ExecutionContext,
    signal?: AbortSignal
  ): Promise<ClinicalToolResult[]> {
    const promises = calls.map(call =>
      this.execute(call.toolId, call.args, context, signal)
    )
    return Promise.all(promises)
  }

  // -------------------------------------------------------------------------
  // Execute a full DAG execution plan (stages run sequentially,
  // tools within a stage run in parallel)
  // -------------------------------------------------------------------------

  async executePlan(
    plan: ExecutionPlan,
    context: ExecutionContext,
    signal?: AbortSignal
  ): Promise<ClinicalToolResult[]> {
    const allResults: ClinicalToolResult[] = []

    for (const stage of plan) {
      if (signal?.aborted) break

      const stageResults = await this.executeParallel(stage.tools, context, signal)
      allResults.push(...stageResults)

      // Check if any critical tool failed — abort remaining stages
      const criticalFailure = stageResults.some((result, idx) => {
        const tool = toolRegistry[stage.tools[idx].toolId]
        const policy: ToolPolicy = { ...DEFAULT_TOOL_POLICY, ...tool?.policy }
        return !result.success && policy.critical
      })

      if (criticalFailure) {
        break
      }
    }

    return allResults
  }

  // -------------------------------------------------------------------------
  // Introspection
  // -------------------------------------------------------------------------

  getExecution(executionId: string): ToolExecutionHandle | undefined {
    return this.executions.get(executionId)
  }

  getAllExecutions(): ToolExecutionHandle[] {
    return Array.from(this.executions.values())
  }

  getActiveExecutions(): ToolExecutionHandle[] {
    return this.getAllExecutions().filter(e => e.status === "running" || e.status === "queued")
  }

  clearExecutions(): void {
    this.executions.clear()
  }
}

// Singleton instance for the application
export const clinicalToolRuntime = new ClinicalToolRuntime()
