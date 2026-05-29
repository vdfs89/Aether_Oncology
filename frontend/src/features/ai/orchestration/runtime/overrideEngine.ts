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

export function isNoOp(override: ExecutionPlanOverride | null): boolean {
  if (!override) return true
  const hasRemoved = override.removedTools && override.removedTools.length > 0
  const hasReordered = override.reorderedStages && override.reorderedStages.length > 0
  const hasForced = override.forcedTools && override.forcedTools.length > 0
  return !hasRemoved && !hasReordered && !hasForced
}

export function applyOverride(
  originalPlan: ExecutionPlan,
  override: ExecutionPlanOverride | null
): ResolvedExecutionPlan {
  if (!override || isNoOp(override)) {
    if (override) {
      console.warn("[OverrideEngine] Received an override that is a no-op (no removed, reordered, or forced tools). Treating as pass-through.")
    }
    // Straight pass-through — no physician mutations
    return {
      originalPlanStages: originalPlan,
      resolvedStages: originalPlan,
      override: override ?? null,
      resolvedAt: Date.now()
    }
  }


  const removedSet = new Set(override.removedTools)
  const forcedSet = new Set(override.forcedTools ?? [])

  // 1. Filter removed tools from each stage, but keep forced ones
  let resolved: ExecutionPlan = originalPlan.map(stage => ({
    tools: stage.tools.filter(t => forcedSet.has(t.toolId) || !removedSet.has(t.toolId))
  }))

  // 2. Drop now-empty stages
  resolved = resolved.filter(stage => stage.tools.length > 0)

  // 3. Ensure forced tools are in the resolved plan
  for (const toolId of forcedSet) {
    const isPresent = resolved.some(stage => stage.tools.some(t => t.toolId === toolId))
    if (!isPresent) {
      const originalTool = originalPlan.flatMap(s => s.tools).find(t => t.toolId === toolId)
      if (originalTool) {
        const origStageIdx = originalPlan.findIndex(s => s.tools.some(t => t.toolId === toolId))
        if (origStageIdx !== -1) {
          while (resolved.length <= origStageIdx) {
            resolved.push({ tools: [] })
          }
          resolved[origStageIdx].tools.push(originalTool)
        }
      } else {
        if (resolved.length === 0) {
          resolved.push({ tools: [] })
        }
        resolved[0].tools.push({ toolId, args: {} })
      }
    }
  }

  // 4. Ensure no empty stages are left
  resolved = resolved.filter(stage => stage.tools.length > 0)

  // 5. Apply stage reordering if present
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
// High-evidence tool IDs — module-level, shared across all heuristics
// ---------------------------------------------------------------------------

const HIGH_EVIDENCE_IDS = new Set([
  "clinical-guidelines-rag",
  "pubmed-search",
  "nccn-guideline",
  "evidence-synthesis"
])

// ---------------------------------------------------------------------------
// computePlanRiskProfile — derives RiskProfile from any ExecutionPlan
// ---------------------------------------------------------------------------

/**
 * Derives a RiskProfile from an ExecutionPlan by inspecting its tool composition.
 * Used to compute the REAL `before` snapshot prior to any physician override.
 */
export function computePlanRiskProfile(plan: ExecutionPlan): RiskProfile {
  const tools = plan.flatMap(s => s.tools)
  const total = tools.length
  const highEvidenceCount = tools.filter(t => HIGH_EVIDENCE_IDS.has(t.toolId)).length

  const hallucinationRisk: RiskProfile["hallucinationRisk"] =
    highEvidenceCount >= 2 ? "LOW"
      : highEvidenceCount === 1 ? "MEDIUM"
        : "HIGH"

  // Evidence strength: high-evidence tools contribute 60% of score, plan size 40%
  const evidenceStrength = total === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round(
      (highEvidenceCount / total) * 60 + Math.min(40, total * 8)
    )))

  const consensusScore: RiskProfile["consensusScore"] =
    highEvidenceCount >= 2 ? "VERIFIED"
      : highEvidenceCount === 1 ? "PARTIAL"
        : "FAILED"

  const fdaCompliance: RiskProfile["fdaCompliance"] =
    hallucinationRisk === "HIGH" ? "FAIL"
      : hallucinationRisk === "MEDIUM" ? "WARNING"
        : "PASS"

  return { hallucinationRisk, evidenceStrength, consensusScore, fdaCompliance }
}

// ---------------------------------------------------------------------------
// computeRiskDiff — before/after risk metrics
// ---------------------------------------------------------------------------

/**
 * Computes a before/after RiskProfile pair for a physician override.
 * `before` is derived from the ORIGINAL plan (never hardcoded).
 * `after` reflects heuristic degradation caused by tool removal.
 */
export function computeRiskDiff(
  originalPlan: ExecutionPlan,
  resolvedPlan: ResolvedExecutionPlan
): { before: RiskProfile; after: RiskProfile } {
  const totalTools = originalPlan.flatMap(s => s.tools).length
  const resolvedTools = resolvedPlan.resolvedStages.flatMap((s: ExecutionStage) => s.tools).length
  const removedCount = totalTools - resolvedTools
  const removedFraction = totalTools === 0 ? 0 : removedCount / totalTools

  const removedHighEvidence = resolvedPlan.override?.removedTools
    .filter(id => HIGH_EVIDENCE_IDS.has(id)).length ?? 0

  // --- BEFORE: computed from the original plan (not hardcoded) ---
  const before = computePlanRiskProfile(originalPlan)

  // --- AFTER: heuristic degradation applied to before baseline ---
  const afterEvidenceStrength = Math.max(
    0,
    Math.min(100, Math.round(before.evidenceStrength - (removedFraction * 40) - (removedHighEvidence * 15)))
  )

  const hallucinationRisk: RiskProfile["hallucinationRisk"] =
    removedHighEvidence > 0 ? "HIGH"
      : removedFraction > 0.5 ? "MEDIUM"
        : before.hallucinationRisk

  const consensusScore: RiskProfile["consensusScore"] =
    removedHighEvidence > 0 ? "PARTIAL"
      : removedFraction > 0.6 ? "FAILED"
        : before.consensusScore

  const fdaCompliance: RiskProfile["fdaCompliance"] =
    hallucinationRisk === "HIGH" ? "FAIL"
      : hallucinationRisk === "MEDIUM" ? "WARNING"
        : "PASS"

  const after: RiskProfile = {
    hallucinationRisk,
    evidenceStrength: afterEvidenceStrength,
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
