/**
 * src/features/ai/orchestration/runtime/overrideEngine.test.ts
 *
 * Tests for the Physician Override Engine.
 * Verifies all override dimensions: no-op, removed tools, reordered stages, forced tools, and combinations.
 */
import { applyOverride, isNoOp, computePlanRiskProfile, computeRiskDiff } from "./overrideEngine"
import { ExecutionPlan } from "../../tools/types"
import { ExecutionPlanOverride } from "./types"

const mockPlan: ExecutionPlan = [
  {
    tools: [
      { toolId: "clinical-guidelines-rag", args: {} },
      { toolId: "pubmed-search", args: {} }
    ]
  },
  {
    tools: [
      { toolId: "other-tool", args: {} }
    ]
  }
]

describe("overrideEngine", () => {
  describe("isNoOp", () => {
    it("should return true for null or empty overrides", () => {
      expect(isNoOp(null)).toBe(true)
      expect(isNoOp({
        approvalRequestId: "1",
        removedTools: [],
        physicianId: "dr-1",
        timestamp: ""
      })).toBe(true)
    })

    it("should return false if there are removed tools", () => {
      expect(isNoOp({
        approvalRequestId: "1",
        removedTools: ["pubmed-search"],
        physicianId: "dr-1",
        timestamp: ""
      })).toBe(false)
    })

    it("should return false if there are reordered stages", () => {
      expect(isNoOp({
        approvalRequestId: "1",
        removedTools: [],
        reorderedStages: [{ from: 0, to: 1 }],
        physicianId: "dr-1",
        timestamp: ""
      })).toBe(false)
    })

    it("should return false if there are forced tools", () => {
      expect(isNoOp({
        approvalRequestId: "1",
        removedTools: [],
        forcedTools: ["clinical-guidelines-rag"],
        physicianId: "dr-1",
        timestamp: ""
      })).toBe(false)
    })
  })

  describe("applyOverride", () => {
    it("should pass through on no-op override", () => {
      const result = applyOverride(mockPlan, null)
      expect(result.resolvedStages).toEqual(mockPlan)
      expect(result.override).toBeNull()
    })

    it("should remove tools correctly", () => {
      const override: ExecutionPlanOverride = {
        approvalRequestId: "1",
        removedTools: ["pubmed-search"],
        physicianId: "dr-1",
        timestamp: ""
      }
      const result = applyOverride(mockPlan, override)
      expect(result.resolvedStages[0].tools).toEqual([
        { toolId: "clinical-guidelines-rag", args: {} }
      ])
    })

    it("should reorder stages correctly", () => {
      const override: ExecutionPlanOverride = {
        approvalRequestId: "1",
        removedTools: [],
        reorderedStages: [{ from: 0, to: 1 }],
        physicianId: "dr-1",
        timestamp: ""
      }
      const result = applyOverride(mockPlan, override)
      expect(result.resolvedStages[0].tools[0].toolId).toBe("other-tool")
      expect(result.resolvedStages[1].tools[0].toolId).toBe("clinical-guidelines-rag")
    })

    it("should preserve forced tools even if they are in removedTools", () => {
      const override: ExecutionPlanOverride = {
        approvalRequestId: "1",
        removedTools: ["clinical-guidelines-rag"],
        forcedTools: ["clinical-guidelines-rag"],
        physicianId: "dr-1",
        timestamp: ""
      }
      const result = applyOverride(mockPlan, override)
      expect(result.resolvedStages[0].tools[0].toolId).toBe("clinical-guidelines-rag")
    })

    it("should add forced tools if they were not in the plan", () => {
      const override: ExecutionPlanOverride = {
        approvalRequestId: "1",
        removedTools: [],
        forcedTools: ["nccn-guideline"],
        physicianId: "dr-1",
        timestamp: ""
      }
      const result = applyOverride(mockPlan, override)
      const allTools = result.resolvedStages.flatMap(s => s.tools.map(t => t.toolId))
      expect(allTools).toContain("nccn-guideline")
    })
  })

  describe("risk calculation", () => {
    it("should calculate base risk correctly", () => {
      const profile = computePlanRiskProfile(mockPlan)
      expect(profile.hallucinationRisk).toBe("LOW") // has 2 high-evidence tools
      expect(profile.fdaCompliance).toBe("PASS")
    })

    it("should degrade risk when high-evidence tools are removed", () => {
      const override: ExecutionPlanOverride = {
        approvalRequestId: "1",
        removedTools: ["clinical-guidelines-rag", "pubmed-search"],
        physicianId: "dr-1",
        timestamp: ""
      }
      const resolved = applyOverride(mockPlan, override)
      const diff = computeRiskDiff(mockPlan, resolved)
      expect(diff.before.hallucinationRisk).toBe("LOW")
      expect(diff.after.hallucinationRisk).toBe("HIGH")
      expect(diff.after.fdaCompliance).toBe("FAIL")
    })
  })
})
