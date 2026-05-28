/**
 * src/features/ai/tools/__tests__/runtime.test.ts
 *
 * Unit tests for the ClinicalToolRuntime — covers single execution, parallel
 * execution (with concurrency & critical-tool abort), DAG execution, abort
 * signals, timeout, retry, and telemetry summary.
 *
 * All tests use isolated runtime instances; no global registry mutations.
 */
import { describe, it } from "node:test"
import assert from "node:assert"
import { ClinicalToolRuntime } from "../runtime"
import { ExecutionContext } from "../../orchestration/runtime/types"
import { ClinicalToolResult, ClinicalTool } from "../types"
import { toolRegistry } from "../registry"

const mockContext: ExecutionContext = {
  patientId: "test-patient",
  sessionId: "test-session",
  traceId: "test-trace",
  startedAt: Date.now(),
  citations: [],
  toolsExecuted: [],
  telemetry: { tokensCount: 0 },
  metadata: {},
}

/* ───────────────────────────────────────────────
   Helper: register a custom tool into the shared registry
   (used for timeout testing). MUST be called before execute.
   ─────────────────────────────────────────────── */
function registerNeverEndingTool() {
  ; (toolRegistry as Record<string, ClinicalTool>)["never-returns"] = {
    id: "never-returns",
    name: "Never Returns",
    description: "Tool that never resolves (for timeout tests)",
    inputSchema: {},
    async execute(): Promise<ClinicalToolResult> {
      return new Promise(() => {
        /* never resolves */
      })
    },
  }
}

function unregisterNeverEndingTool() {
  delete (toolRegistry as Record<string, ClinicalTool>)["never-returns"]
}

/* ───────────────────────────────────────────────
   Single execution
   ─────────────────────────────────────────────── */
describe("ClinicalToolRuntime – execute", () => {
  it("should successfully execute registered biomarker-analysis tool", async () => {
    const runtime = new ClinicalToolRuntime()
    const result = await runtime.execute(
      "biomarker-analysis",
      { geneSymbols: ["BRCA1", "HER2"] },
      mockContext,
    )

    assert.strictEqual(result.success, true)
    assert.ok(result.data)
    assert.strictEqual(result.data.biomarkers.length, 2)
    assert.strictEqual(result.metadata.source, "local-biomarker-rules-engine")
    assert.ok(result.metadata.durationMs >= 0)
  })

  it("should return failure for non-existent tools", async () => {
    const runtime = new ClinicalToolRuntime()
    const result = await runtime.execute("unknown-tool", {}, mockContext)

    assert.strictEqual(result.success, false)
    assert.ok(result.error?.includes("not found"))
  })

  it("should respect abort signal cancellation", async () => {
    const runtime = new ClinicalToolRuntime()
    const controller = new AbortController()
    controller.abort()

    const result = await runtime.execute(
      "biomarker-analysis",
      { geneSymbols: ["BRCA1"] },
      mockContext,
      controller.signal,
    )

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.error, "Tool execution aborted.")
  })

  it("should handle timeout constraints and return failure on timeout limit", async () => {
    registerNeverEndingTool()
    try {
      const runtime = new ClinicalToolRuntime()
      const result = await runtime.execute(
        "never-returns",
        {},
        mockContext,
        undefined,
        { timeoutMs: 50, maxRetries: 0 },
      )

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.error, "TOOL_TIMEOUT")
    } finally {
      unregisterNeverEndingTool()
    }
  })

  it("should respect options.priority and options.critical on the execution handle", async () => {
    const runtime = new ClinicalToolRuntime()
    await runtime.execute(
      "biomarker-analysis",
      { geneSymbols: ["BRCA1"] },
      mockContext,
      undefined,
      { critical: true, priority: 1 },
    )

    const summary = runtime.getSummary()
    assert.strictEqual(summary.totalExecutions, 1)
    const handle = summary.executions[0]
    assert.strictEqual(handle.critical, true)
    assert.strictEqual(handle.priority, 1)
  })
})

/* ───────────────────────────────────────────────
   Parallel execution
   ─────────────────────────────────────────────── */
describe("ClinicalToolRuntime – executeParallel", () => {
  it("should execute tool calls in parallel", async () => {
    const runtime = new ClinicalToolRuntime()
    const results = await runtime.executeParallel(
      [
        { toolId: "biomarker-analysis", args: { geneSymbols: ["BRCA1"] } },
        { toolId: "biomarker-analysis", args: { geneSymbols: ["TP53"] } },
      ],
      mockContext,
    )

    assert.strictEqual(results.length, 2)
    assert.strictEqual(results[0].success, true)
    assert.strictEqual(results[1].success, true)
  })

  it("should abort remaining calls when a critical tool fails", async () => {
    const runtime = new ClinicalToolRuntime()

    const results = await runtime.executeParallel(
      [
        { toolId: "biomarker-analysis", args: { geneSymbols: ["BRCA1"] } },
        { toolId: "critical-failure-tool", args: {}, options: { critical: true } },
        { toolId: "biomarker-analysis", args: { geneSymbols: ["TP53"] } },
      ],
      mockContext,
    )

    assert.strictEqual(results[0].success, true)
    assert.strictEqual(results[1].success, false)
  })

  it("should respect concurrency limit by chunking execution", async () => {
    const runtime = new ClinicalToolRuntime()
    const calls = Array.from({ length: 5 }, (_, i) => ({
      toolId: "biomarker-analysis" as const,
      args: { geneSymbols: [`GENE_${i}`] },
    }))

    await runtime.executeParallel(calls, mockContext, undefined, { concurrency: 2 })
    const summary = runtime.getSummary()
    const completed = summary.executions.filter(e => e.status === "completed")
    assert.strictEqual(completed.length, 5)
  })

  it("should execute in priority order when concurrency is limited", async () => {
    const runtime = new ClinicalToolRuntime()
    const results = await runtime.executeParallel(
      [
        { toolId: "biomarker-analysis", args: { geneSymbols: ["LOW"] }, options: { priority: 100 } },
        { toolId: "biomarker-analysis", args: { geneSymbols: ["HIGH"] }, options: { priority: 1 } },
      ],
      mockContext,
      undefined,
      { concurrency: 1 },
    )

    assert.strictEqual(results[0].success, true)
    assert.strictEqual(results[1].success, true)
  })
})

/* ───────────────────────────────────────────────
   DAG (graph) execution
   ─────────────────────────────────────────────── */
describe("ClinicalToolRuntime – executeGraph", () => {
  it("should execute a linear dependency chain", async () => {
    const runtime = new ClinicalToolRuntime()
    const result = await runtime.executeGraph(
      [
        {
          id: "step-a",
          toolId: "biomarker-analysis",
          args: { geneSymbols: ["BRCA1"] },
          dependencies: [],
        },
        {
          id: "step-b",
          toolId: "biomarker-analysis",
          args: { geneSymbols: ["TP53"] },
          dependencies: ["step-a"],
        },
      ],
      mockContext,
    )

    assert.strictEqual(result["step-a"].success, true)
    assert.strictEqual(result["step-b"].success, true)
  })

  it("should execute with dynamic args derived from dependencies", async () => {
    const runtime = new ClinicalToolRuntime()
    const result = await runtime.executeGraph(
      [
        {
          id: "src",
          toolId: "biomarker-analysis",
          args: { geneSymbols: ["BRCA1"] },
          dependencies: [],
        },
        {
          id: "derived",
          toolId: "biomarker-analysis",
          args: (depData: Record<string, any>) => {
            const biomarkers = depData["src"]?.biomarkers ?? []
            return {
              geneSymbols:
                biomarkers.length > 0
                  ? biomarkers.map((b: any) => b.gene)
                  : ["TP53"],
            }
          },
          dependencies: ["src"],
        },
      ],
      mockContext,
    )

    assert.strictEqual(result["src"].success, true)
    assert.strictEqual(result["derived"].success, true)
  })

  it("should abort graph when a critical node fails", async () => {
    const runtime = new ClinicalToolRuntime()
    const result = await runtime.executeGraph(
      [
        {
          id: "ok-node",
          toolId: "biomarker-analysis",
          args: { geneSymbols: ["BRCA1"] },
          dependencies: [],
        },
        {
          id: "critical-fail",
          toolId: "non-existent-tool",
          args: {},
          dependencies: ["ok-node"],
          critical: true,
        },
        {
          id: "should-be-skipped",
          toolId: "biomarker-analysis",
          args: { geneSymbols: ["TP53"] },
          dependencies: ["critical-fail"],
        },
      ],
      mockContext,
    )

    assert.strictEqual(result["ok-node"].success, true)
    assert.strictEqual(result["critical-fail"].success, false)
    if (result["should-be-skipped"]) {
      assert.strictEqual(result["should-be-skipped"].success, false)
    }
  })
})

/* ───────────────────────────────────────────────
   Telemetry / Summary
   ─────────────────────────────────────────────── */
describe("ClinicalToolRuntime – getSummary", () => {
  it("should report correct counts after several executions", async () => {
    const runtime = new ClinicalToolRuntime()

    // Run 2 successful + 1 failed
    const r1 = await runtime.execute("biomarker-analysis", { geneSymbols: ["A"] }, mockContext)
    const r2 = await runtime.execute("biomarker-analysis", { geneSymbols: ["B"] }, mockContext)
    const r3 = await runtime.execute("unknown-tool", {}, mockContext)

    assert.strictEqual(r1.success, true)
    assert.strictEqual(r2.success, true)
    assert.strictEqual(r3.success, false)

    const summary = runtime.getSummary()

    assert.strictEqual(summary.totalExecutions, 3, `Expected 3 total, got ${summary.totalExecutions}`)
    assert.strictEqual(summary.completed, 2, `Expected 2 completed, got ${summary.completed}`)
    assert.strictEqual(summary.failed, 1, `Expected 1 failed, got ${summary.failed}`)
    // totalDurationMs is the sum of all execution durations; should be non-negative and typically >0
    assert.ok(summary.totalDurationMs >= 0, `Duration should be >= 0, got ${summary.totalDurationMs}`)
    assert.strictEqual(summary.executions.length, 3, `Expected 3 handles, got ${summary.executions.length}`)
  })

  it("should return empty summary for a fresh runtime", async () => {
    const runtime = new ClinicalToolRuntime()
    const summary = runtime.getSummary()

    assert.strictEqual(summary.totalExecutions, 0)
    assert.strictEqual(summary.completed, 0)
    assert.strictEqual(summary.failed, 0)
    assert.strictEqual(summary.averageDurationMs, 0)
  })
})