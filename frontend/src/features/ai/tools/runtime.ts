/**
 * src/features/ai/tools/runtime.ts
 *
 * Clinical Tool Runtime Engine — orchestrates parallel and sequential tool executions
 * with retries, timeouts, dependency graphs, critical-tool semantics, concurrency
 * limiting, priority scheduling, and execution telemetry.
 */
import { nanoid } from "nanoid"
import {
  ClinicalToolResult,
  ClinicalTool,
  ToolExecutionHandle,
  ToolExecutionOptions,
  ToolExecutionStatus,
  ToolExecutionSummary,
  GraphNode
} from "./types"
import { toolRegistry } from "./registry"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { ExecutionContext, ClinicalRuntimeState } from "../orchestration/runtime/types"

/* ───────────────────────────────────────────────
   Runtime-level defaults
   ─────────────────────────────────────────────── */
const DEFAULTS = {
  timeoutMs: 8_000,
  maxRetries: 3,
  concurrency: 0,       // 0 = unlimited
  backoffBaseMs: 100,
} as const

/**
 * Priority queue entry wrapper.
 */
interface QueueItem {
  handle: ToolExecutionHandle
  executeFn: () => Promise<ClinicalToolResult>
  priority: number
}

/* ───────────────────────────────────────────────
   ClinicalToolRuntime
   ─────────────────────────────────────────────── */
export class ClinicalToolRuntime {
  private executions = new Map<string, ToolExecutionHandle>()

  /* ---------- Public API ---------- */

  /**
   * Executes a single tool with timeout, retry, cancellation, and event telemetry.
   *
   * Accepts a per-call `ToolExecutionOptions` object that can override the runtime's
   * default timeout, retry count, critical-flag, and priority.
   */
  async execute(
    toolId: string,
    args: any,
    context: ExecutionContext,
    signal?: AbortSignal,
    options?: ToolExecutionOptions
  ): Promise<ClinicalToolResult> {
    const timeoutMs = options?.timeoutMs ?? DEFAULTS.timeoutMs
    const maxRetries = options?.maxRetries ?? DEFAULTS.maxRetries
    const isCritical = options?.critical ?? false
    const priority = options?.priority ?? 100 // lower = higher priority

    const executionId = nanoid()

    const handle = this.createHandle(executionId, toolId, isCritical, priority)
    handle.status = "queued"
    this.executions.set(executionId, handle)

    const metadata = this.buildMetadata(context)

    this.publish("ToolStarted", { toolId, executionId }, metadata)

    // Resolve the tool
    const tool = toolRegistry[toolId] as ClinicalTool | undefined
    if (!tool) {
      return this.fail(
        handle,
        `Tool '${toolId}' not found in registry.`,
        metadata,
        Date.now() - handle.startedAt,
        executionId,
        toolId,
      )
    }

    handle.status = "running"
    let attempt = 0
    let lastError: any = null

    while (attempt <= maxRetries) {
      // Check for abort *before* each attempt
      if (signal?.aborted) {
        return this.fail(
          handle,
          "Tool execution aborted.",
          metadata,
          Date.now() - handle.startedAt,
          executionId,
          toolId,
        )
      }

      attempt++
      handle.attemptCount = attempt

      try {
        // Enforce timeout via Promise.race
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("TOOL_TIMEOUT")), timeoutMs)
        })
        const executionPromise = tool.execute(args, context)
        const result = await Promise.race([executionPromise, timeoutPromise])

        // Success
        handle.status = "completed"
        handle.completedAt = Date.now()
        this.publish("ToolCompleted", { toolId, executionId, result }, {
          ...metadata,
          timestamp: Date.now(),
        })

        return result
      } catch (err: any) {
        lastError = err
        const msg = err.message === "TOOL_TIMEOUT"
          ? `Tool ${toolId} timed out (attempt ${attempt}/${maxRetries + 1})`
          : `Tool ${toolId} failed (attempt ${attempt}/${maxRetries + 1}): ${err.message}`

        console.warn(`[Tool Runtime] ${msg}`)

        // Exponential backoff before retrying
        if (attempt <= maxRetries) {
          const backoff = DEFAULTS.backoffBaseMs * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, backoff))
        }
      }
    }

    // All attempts exhausted
    const finalError = lastError?.message ?? String(lastError) ?? "Unknown tool failure."
    return this.fail(
      handle,
      finalError,
      metadata,
      Date.now() - handle.startedAt,
      executionId,
      toolId,
    )
  }

  /**
   * Executes multiple tools **with an optional concurrency cap**.
   * Supports priority-ordering: items with lower `priority` values are started first
   * when the concurrency limit binds.
   *
   * If any **critical** tool fails, the entire batch is aborted immediately.
   */
  async executeParallel(
    calls: Array<{
      toolId: string
      args: any
      options?: ToolExecutionOptions
    }>,
    context: ExecutionContext,
    signal?: AbortSignal,
    globalOptions?: ToolExecutionOptions
  ): Promise<ClinicalToolResult[]> {
    const maxConcurrency = globalOptions?.concurrency ?? DEFAULTS.concurrency
    const results = new Array<ClinicalToolResult>(calls.length)
    let aborted = false

    // Sort calls by priority (lower = sooner)
    const sorted = calls
      .map((call, idx) => ({
        call,
        priority: call.options?.priority ?? globalOptions?.priority ?? 100,
        idx,
      }))
      .sort((a, b) => a.priority - b.priority)

    const executeOne = async (item: typeof sorted[0]): Promise<void> => {
      if (aborted || signal?.aborted) {
        results[item.idx] = {
          success: false,
          error: "Batch execution aborted.",
          metadata: { durationMs: 0 },
        }
        return
      }

      const mergedOptions: ToolExecutionOptions = {
        ...globalOptions,
        ...item.call.options,
      }

      const result = await this.execute(
        item.call.toolId,
        item.call.args,
        context,
        signal,
        mergedOptions,
      )
      results[item.idx] = result

      // Critical failure → abort the remaining
      if (!result.success && mergedOptions.critical) {
        console.warn(
          `[Tool Runtime] Critical tool ${item.call.toolId} failed — aborting batch.`,
        )
        aborted = true
      }
    }

    if (maxConcurrency > 0) {
      // Chunked concurrency: process N items at a time
      for (let i = 0; i < sorted.length; i += maxConcurrency) {
        const chunk = sorted.slice(i, i + maxConcurrency)
        await Promise.all(chunk.map(executeOne))
        if (aborted) break
      }
    } else {
      // Unlimited concurrency — fire all at once
      await Promise.all(sorted.map(executeOne))
    }

    return results
  }

  /**
   * Executes a Directed Acyclic Graph (DAG) of tool calls.
   *
   * Supports:
   *  - Dependency resolution (parents before children)
   *  - Dynamic arg derivation via `(resolvedData) => any`
   *  - Critical-node abort propagation
   *  - Per-node timeout override
   */
  async executeGraph(
    nodes: GraphNode[],
    context: ExecutionContext,
    signal?: AbortSignal,
    globalOptions?: ToolExecutionOptions
  ): Promise<Record<string, ClinicalToolResult>> {
    const resolved: Record<string, ClinicalToolResult> = {}
    const runningNodes = new Map<string, Promise<ClinicalToolResult>>()
    let aborted = false

    const executeNode = async (node: GraphNode): Promise<ClinicalToolResult> => {
      // If already running, return cached promise
      if (runningNodes.has(node.id)) return runningNodes.get(node.id)!
      // If already resolved, return cached result
      if (resolved[node.id]) return resolved[node.id]

      // If batch aborted, return early
      if (aborted || signal?.aborted) {
        return {
          success: false,
          error: "Graph execution aborted.",
          metadata: { durationMs: 0 },
        }
      }

      const promise = (async () => {
        // Wait for all dependencies first
        await Promise.all(
          node.dependencies.map(depId => {
            const depNode = nodes.find(n => n.id === depId)
            if (!depNode) {
              throw new Error(
                `Dependency Error: Node '${node.id}' depends on missing Node '${depId}'`,
              )
            }
            return executeNode(depNode)
          }),
        )

        if (aborted || signal?.aborted) {
          return {
            success: false,
            error: "Graph execution aborted.",
            metadata: { durationMs: 0 },
          }
        }

        // Resolve args (dynamic mapper if function)
        let nodeArgs = node.args
        if (typeof node.args === "function") {
          const depData: Record<string, any> = {}
          for (const depId of node.dependencies) {
            depData[depId] = resolved[depId]?.data
          }
          nodeArgs = (node.args as (d: Record<string, any>) => any)(depData)
        }

        // Merge per-node options with globals
        const mergedOptions: ToolExecutionOptions = {
          ...globalOptions,
          timeoutMs: node.timeoutMs ?? globalOptions?.timeoutMs,
          critical: node.critical ?? globalOptions?.critical,
          priority: node.priority ?? globalOptions?.priority,
        }

        const result = await this.execute(
          node.toolId,
          nodeArgs,
          context,
          signal,
          mergedOptions,
        )

        resolved[node.id] = result

        // Critical failure → abort entire graph
        if (!result.success && mergedOptions.critical) {
          console.warn(
            `[Tool Runtime] Critical graph node '${node.id}' (${node.toolId}) failed — aborting graph.`,
          )
          aborted = true
        }

        return result
      })()

      runningNodes.set(node.id, promise)
      return promise
    }

    // Trigger all execution pipelines concurrently — the DAG's own dependency
    // edges guarantee topological ordering.
    await Promise.all(nodes.map(executeNode))

    return resolved
  }

  /**
   * Returns a telemetry-optimised summary of all executions tracked so far.
   */
  getSummary(): ToolExecutionSummary {
    const handles = Array.from(this.executions.values())
    const total = handles.length
    const completed = handles.filter(h => h.status === "completed").length
    const failed = handles.filter(h => h.status === "failed").length
    const totalDurationMs = handles.reduce(
      (acc, h) => acc + ((h.completedAt ?? Date.now()) - h.startedAt),
      0,
    )

    return {
      totalExecutions: total,
      completed,
      failed,
      aborted: handles.filter(h => h.error?.includes("aborted")).length,
      totalDurationMs,
      averageDurationMs: total > 0 ? totalDurationMs / total : 0,
      executions: handles,
    }
  }

  /**
   * Look up a single execution handle by its ID.
   */
  getExecutionHandle(executionId: string): ToolExecutionHandle | undefined {
    return this.executions.get(executionId)
  }

  /* ---------- Internal helpers ---------- */

  private createHandle(
    executionId: string,
    toolId: string,
    critical: boolean,
    priority: number,
  ): ToolExecutionHandle {
    return {
      executionId,
      toolId,
      status: "queued" as ToolExecutionStatus,
      startedAt: Date.now(),
      critical,
      priority,
      attemptCount: 0,
    }
  }

  private buildMetadata(context: ExecutionContext) {
    return {
      traceId: context.traceId,
      sessionId: context.sessionId,
      patientId: context.patientId,
      timestamp: Date.now(),
      runtimeState: "EXECUTING" as ClinicalRuntimeState,
    }
  }

  private publish(
    type: "ToolStarted" | "ToolCompleted" | "ToolFailed" | "ToolStreaming",
    payload: any,
    metadata: Record<string, any>,
  ): void {
    clinicalEventBus.publish({
      type: type as any,
      payload,
      metadata,
    } as any)
  }

  private fail(
    handle: ToolExecutionHandle,
    error: string,
    metadata: Record<string, any>,
    durationMs: number,
    executionId: string,
    toolId: string,
  ): ClinicalToolResult {
    handle.status = "failed"
    handle.error = error
    handle.completedAt = Date.now()

    this.publish("ToolFailed", { toolId, executionId, error }, {
      ...metadata,
      timestamp: Date.now(),
    })

    return {
      success: false,
      error,
      metadata: { durationMs },
    }
  }
}

/* ───────────────────────────────────────────────
   Singleton export
   ─────────────────────────────────────────────── */
export const clinicalToolRuntime = new ClinicalToolRuntime()