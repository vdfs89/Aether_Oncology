/**
 * src/features/ai/orchestration/runtime/overrideEngine.ts
 *
 * The pure functional core of the Physician Override Layer.
 * Transforms an ExecutionPlan + ExecutionPlanOverride into an immutable
 * ResolvedExecutionPlan that the runtime will actually execute.
 *
 * Key guarantees:
 *   - The original plan is NEVER mutated.
 *   - A full audit trail is embedded in the resolved plan.
 *   - Risk metrics are recalculated after every mutation.
 */
import { ExecutionPlan, ExecutionStage } from "../../tools/types"
import {
  ExecutionPlanOverride,
  ResolvedExecutionPlan,
  RiskProfile
} from "./types"

// ---------------------------------------------------------------------------
// applyOverride — builds the ResolvedExecutionPlan
// ---------------------------------------------------------------------------

export function applyOverride(
  originalPlan: ExecutionPlan,
  override: ExecutionPlanOverride | null
): ResolvedExecutionPlan {
  if (!override || override.removedTools.length === 0) {
    // Straight pass-through — no physician mutations
    return {
      originalPlanStages: originalPlan,
      resolvedStages: originalPlan,
      override: override ?? null,
      resolvedAt: Date.now()
    }
  }

  const removedSet = new Set(override.removedTools)

  // 1. Filter removed tools from each stage
  let resolved: ExecutionPlan = originalPlan.map(stage => ({
    tools: stage.tools.filter(t => !removedSet.has(t.toolId))
  }))

  // 2. Drop now-empty stages
  resolved = resolved.filter(stage => stage.tools.length > 0)

  // 3. Apply stage reordering if present
  if (override.reorderedStages) {
    for (const { from, to } of override.reorderedStages) {
      if (from >= 0 && from < resolved.length && to >= 0 && to < resolved.length) {
        const [moved] = resolved.splice(from, 1)
        resolved.splice(to, 0, moved)
      }
    }
  }

  return {
    originalPlanStages: originalPlan,
    resolvedStages: resolved,
    override,
    resolvedAt: Date.now()
  }
}

// ---------------------------------------------------------------------------
// computeRiskDiff — before/after risk metrics
// ---------------------------------------------------------------------------

/**
 * Heuristic risk calculator.
 * A tool's removal changes the evidence envelope. This is intentionally
 * lightweight — the real validator is the Safety Judge (OpenAI).
 */
export function computeRiskDiff(
  originalPlan: ExecutionPlan,
  resolvedPlan: ResolvedExecutionPlan
): { before: RiskProfile; after: RiskProfile } {
  const totalTools = originalPlan.flatMap(s => s.tools).length
  const resolvedTools = resolvedPlan.resolvedStages.flatMap((s: ExecutionStage) => s.tools).length
  const removedCount = totalTools - resolvedTools
  const removedFraction = totalTools === 0 ? 0 : removedCount / totalTools

  // High-evidence tools typically have specific IDs — detect via naming convention
  const highEvidenceIds = new Set(["clinical-guidelines-rag", "pubmed-search", "nccn-guideline", "evidence-synthesis"])

  const removedHighEvidence = resolvedPlan.override?.removedTools
    .filter(id => highEvidenceIds.has(id)).length ?? 0

  // --- BEFORE ---
  const before: RiskProfile = {
    hallucinationRisk: "LOW",
    evidenceStrength: 92,
    consensusScore: "VERIFIED",
    fdaCompliance: "PASS"
  }

  // --- AFTER (heuristic degradation) ---
  let evidenceStrength = 92 - (removedFraction * 40) - (removedHighEvidence * 15)
  evidenceStrength = Math.max(0, Math.min(100, Math.round(evidenceStrength)))

  const hallucinationRisk: RiskProfile["hallucinationRisk"] =
    removedHighEvidence > 0 ? "HIGH"
    : removedFraction > 0.5 ? "MEDIUM"
    : "LOW"

  const consensusScore: RiskProfile["consensusScore"] =
    removedHighEvidence > 0 ? "PARTIAL"
    : removedFraction > 0.6 ? "FAILED"
    : "VERIFIED"

  const fdaCompliance: RiskProfile["fdaCompliance"] =
    hallucinationRisk === "HIGH" ? "FAIL"
    : hallucinationRisk === "MEDIUM" ? "WARNING"
    : "PASS"

  const after: RiskProfile = {
    hallucinationRisk,
    evidenceStrength,
    consensusScore,
    fdaCompliance
  }

  return { before, after }
}

// ---------------------------------------------------------------------------
// getToolsFromPlan — utility
// ---------------------------------------------------------------------------

export function getToolsFromPlan(plan: ExecutionPlan): Array<{ toolId: string; stageIndex: number }> {
  return plan.flatMap((stage, i) =>
    stage.tools.map(t => ({ toolId: t.toolId, stageIndex: i }))
  )
}
