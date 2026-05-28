/**
 * __tests__/runtime.test.ts
 *
 * Unit tests for the ClinicalToolRuntime Engine.
 * Covers: single execution, retries, timeouts, parallel execution,
 *         execution plans (DAG), cancellation, and introspection.
 */
import { ClinicalToolRuntime } from "../runtime"
import { ClinicalTool, ClinicalToolResult, ExecutionPlan } from "../types"
import { ExecutionContext } from "../../orchestration/runtime/types"

// ---------------------------------------------------------------------------
// Mock EventBus (tools/runtime.ts imports clinicalEventBus)
// ---------------------------------------------------------------------------
jest.mock("../../orchestration/runtime/eventBus", () => ({
  clinicalEventBus: {
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    patientId: "patient-001",
    sessionId: "session-001",
    traceId: "trace-001",
    startedAt: Date.now(),
    citations: [],
    toolsExecuted: [],
    telemetry: { tokensCount: 0 },
    metadata: {},
    ...overrides
  }
}

function makeTool(overrides: Partial<ClinicalTool> = {}): ClinicalTool {
  return {
    id: "test-tool",
    name: "Test Tool",
    description: "A test tool",
    inputSchema: {},
    execute: jest.fn().mockResolvedValue({ value: 42 }),
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClinicalToolRuntime", () => {
  let runtime: ClinicalToolRuntime
  const ctx = makeContext()

  beforeEach(() => {
    runtime = new ClinicalToolRuntime()
    // Clear the registry before each test
    const registry = require("../registry")
    // Wipe existing keys
    Object.keys(registry.toolRegistry).forEach(k => delete registry.toolRegistry[k])
  })

  // -----------------------------------------------------------------------
  // Single execution
  // -----------------------------------------------------------------------

  it("should execute a registered tool and return a success result", async () => {
    const tool = makeTool()
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    const result = await runtime.execute(tool.id, { input: "x" }, ctx)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ value: 42 })
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.metadata.source).toBe("test-tool")
  })

  it("should return an error result for an unregistered tool", async () => {
    const result = await runtime.execute("nonexistent-tool", {}, ctx)

    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  // -----------------------------------------------------------------------
  // Retries
  // -----------------------------------------------------------------------

  it("should retry a failing tool up to maxRetries times", async () => {
    const executeFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ recovered: true })

    const tool = makeTool({
      id: "retry-tool",
      execute: executeFn,
      policy: { timeoutMs: 5000, maxRetries: 3, critical: false }
    })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    const result = await runtime.execute(tool.id, {}, ctx)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ recovered: true })
    expect(executeFn).toHaveBeenCalledTimes(3) // 2 failures + 1 success
  })

  it("should fail after exhausting all retries", async () => {
    const executeFn = jest.fn().mockRejectedValue(new Error("persistent failure"))
    const tool = makeTool({
      id: "always-fail",
      execute: executeFn,
      policy: { timeoutMs: 5000, maxRetries: 1, critical: false }
    })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    const result = await runtime.execute(tool.id, {}, ctx)

    expect(result.success).toBe(false)
    expect(result.error).toBe("persistent failure")
    expect(executeFn).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  // -----------------------------------------------------------------------
  // Timeout
  // -----------------------------------------------------------------------

  it("should timeout a tool that exceeds its timeoutMs", async () => {
    const slowExecute = jest.fn(
      () => new Promise(resolve => setTimeout(resolve, 10000))
    )
    const tool = makeTool({
      id: "slow-tool",
      execute: slowExecute,
      policy: { timeoutMs: 50, maxRetries: 0, critical: false }
    })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    const result = await runtime.execute(tool.id, {}, ctx)

    expect(result.success).toBe(false)
    expect(result.error).toContain("TOOL_TIMEOUT")
  })

  // -----------------------------------------------------------------------
  // Cancellation
  // -----------------------------------------------------------------------

  it("should respect abort signal and return cancelled result", async () => {
    const controller = new AbortController()
    controller.abort() // pre-abort

    const tool = makeTool({ id: "cancel-tool" })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    const result = await runtime.execute(tool.id, {}, ctx, controller.signal)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Aborted by user")
  })

  // -----------------------------------------------------------------------
  // Parallel execution
  // -----------------------------------------------------------------------

  it("should execute multiple tools in parallel", async () => {
    const toolA = makeTool({
      id: "parallel-a",
      execute: jest.fn().mockResolvedValue({ from: "A" })
    })
    const toolB = makeTool({
      id: "parallel-b",
      execute: jest.fn().mockResolvedValue({ from: "B" })
    })
    const registry = require("../registry")
    registry.toolRegistry["parallel-a"] = toolA
    registry.toolRegistry["parallel-b"] = toolB

    const results = await runtime.executeParallel(
      [
        { toolId: "parallel-a", args: {} },
        { toolId: "parallel-b", args: {} }
      ],
      ctx
    )

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[0].data).toEqual({ from: "A" })
    expect(results[1].success).toBe(true)
    expect(results[1].data).toEqual({ from: "B" })
  })

  // -----------------------------------------------------------------------
  // Execution Plan (DAG)
  // -----------------------------------------------------------------------

  it("should execute a multi-stage plan sequentially, with intra-stage parallelism", async () => {
    const calls: string[] = []

    const toolX = makeTool({
      id: "stage1-x",
      execute: jest.fn(async () => {
        calls.push("X-start")
        await new Promise(r => setTimeout(r, 20))
        calls.push("X-end")
        return { x: true }
      })
    })
    const toolY = makeTool({
      id: "stage1-y",
      execute: jest.fn(async () => {
        calls.push("Y-start")
        await new Promise(r => setTimeout(r, 10))
        calls.push("Y-end")
        return { y: true }
      })
    })
    const toolZ = makeTool({
      id: "stage2-z",
      execute: jest.fn(async () => {
        calls.push("Z-start")
        calls.push("Z-end")
        return { z: true }
      })
    })

    const registry = require("../registry")
    registry.toolRegistry["stage1-x"] = toolX
    registry.toolRegistry["stage1-y"] = toolY
    registry.toolRegistry["stage2-z"] = toolZ

    const plan: ExecutionPlan = [
      { tools: [{ toolId: "stage1-x", args: {} }, { toolId: "stage1-y", args: {} }] },
      { tools: [{ toolId: "stage2-z", args: {} }] }
    ]

    const results = await runtime.executePlan(plan, ctx)

    expect(results).toHaveLength(3)
    // Stage 2 (Z) must start after Stage 1 (X, Y) both complete
    const zStartIdx = calls.indexOf("Z-start")
    const xEndIdx = calls.indexOf("X-end")
    const yEndIdx = calls.indexOf("Y-end")
    expect(zStartIdx).toBeGreaterThan(xEndIdx)
    expect(zStartIdx).toBeGreaterThan(yEndIdx)
  })

  it("should abort remaining stages when a critical tool fails", async () => {
    const toolCritical = makeTool({
      id: "critical-fail",
      execute: jest.fn().mockRejectedValue(new Error("critical error")),
      policy: { timeoutMs: 5000, maxRetries: 0, critical: true }
    })
    const toolAfter = makeTool({
      id: "should-not-run",
      execute: jest.fn().mockResolvedValue({ ran: true })
    })

    const registry = require("../registry")
    registry.toolRegistry["critical-fail"] = toolCritical
    registry.toolRegistry["should-not-run"] = toolAfter

    const plan: ExecutionPlan = [
      { tools: [{ toolId: "critical-fail", args: {} }] },
      { tools: [{ toolId: "should-not-run", args: {} }] }
    ]

    const results = await runtime.executePlan(plan, ctx)

    expect(results).toHaveLength(1) // only stage 1 results
    expect(results[0].success).toBe(false)
    expect(toolAfter.execute).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Introspection
  // -----------------------------------------------------------------------

  it("should track all executions for introspection", async () => {
    const tool = makeTool({ id: "tracked-tool" })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    await runtime.execute(tool.id, { a: 1 }, ctx)
    await runtime.execute(tool.id, { a: 2 }, ctx)

    const all = runtime.getAllExecutions()
    expect(all).toHaveLength(2)
    expect(all.every(e => e.status === "completed")).toBe(true)
  })

  it("should clear all executions", async () => {
    const tool = makeTool({ id: "clear-tool" })
    const registry = require("../registry")
    registry.toolRegistry[tool.id] = tool

    await runtime.execute(tool.id, {}, ctx)
    expect(runtime.getAllExecutions()).toHaveLength(1)

    runtime.clearExecutions()
    expect(runtime.getAllExecutions()).toHaveLength(0)
  })
})
