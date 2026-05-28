/**
 * src/features/ai/orchestration/planner/planner.ts
 *
 * The Clinical Inference Planner.
 *
 * Orchestrates the 4 layers:
 * 1. Intent Detection (regex/heuristic)
 * 2. Tool Selection (based on capabilities)
 * 3. Execution Graph Builder (DAG of dependencies)
 * 4. Risk Escalation (requiresApproval logic)
 */
import { clinicalEventBus } from "../runtime/eventBus"
import { ExecutionContext } from "../runtime/types"
import { ExecutionPlan, ExecutionStage } from "../../tools/types"
import { detectIntent, IntentDetectionResult } from "./intentDetector"
import { findToolsForIntent, getToolCapability } from "./toolCapabilities"
import { ClinicalRiskLevel, PlannerResult, ToolCapability } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaxRisk(levels: ClinicalRiskLevel[]): ClinicalRiskLevel {
  const riskWeights: Record<ClinicalRiskLevel, number> = {
    LOW: 0,
    MODERATE: 1,
    HIGH: 2,
    CRITICAL: 3
  }
  let maxWeight = -1
  let maxRisk: ClinicalRiskLevel = "LOW"

  for (const risk of levels) {
    if (riskWeights[risk] > maxWeight) {
      maxWeight = riskWeights[risk]
      maxRisk = risk
    }
  }
  return maxRisk
}

/**
 * Topological sort of tools to build an ExecutionPlan (DAG).
 * Tools without unmet dependencies run in the current stage.
 */
function buildExecutionGraph(
  selectedTools: ToolCapability[],
  contextArgs: Record<string, any>
): ExecutionPlan {
  const plan: ExecutionPlan = []
  const pending = new Set(selectedTools.map(t => t.toolId))
  const completed = new Set<string>()

  // Safeguard against infinite loops if dependencies are circular or missing
  let safetyCounter = 0
  const MAX_ITERATIONS = 10

  while (pending.size > 0 && safetyCounter < MAX_ITERATIONS) {
    safetyCounter++
    const currentStageTools: Array<{ toolId: string; args: unknown }> = []

    for (const toolId of Array.from(pending)) {
      const capability = getToolCapability(toolId)
      if (!capability) continue

      // Check if all dependencies are satisfied (either already completed, or not in the selected set)
      const depsSatisfied = capability.dependencies.every(
        depId => completed.has(depId) || !pending.has(depId)
      )

      if (depsSatisfied) {
        currentStageTools.push({ toolId, args: contextArgs })
      }
    }

    if (currentStageTools.length === 0) {
      // Circular dependency or missing dependency in selected set.
      // Force remaining tools into the next stage to break the loop.
      for (const toolId of Array.from(pending)) {
        currentStageTools.push({ toolId, args: contextArgs })
      }
    }

    plan.push({ tools: currentStageTools })

    for (const t of currentStageTools) {
      pending.delete(t.toolId)
      completed.add(t.toolId)
    }
  }

  return plan
}

// ---------------------------------------------------------------------------
// Planner Pipeline
// ---------------------------------------------------------------------------

export class ClinicalPlanner {
  
  plan(prompt: string, context: ExecutionContext): PlannerResult {
    const timestamp = Date.now()
    
    // Publish planning started
    clinicalEventBus.publish({
      type: "StateTransition", // Mapping to existing generic events for now, or could use custom
      payload: { from: "HYDRATING", to: "PLANNING" },
      metadata: {
        traceId: context.traceId,
        sessionId: context.sessionId,
        patientId: context.patientId,
        timestamp,
        runtimeState: "PLANNING"
      }
    })

    const reasoningLog: string[] = []

    // --- LAYER 1: Intent Detection ---
    const intentResult = detectIntent(prompt)
    reasoningLog.push(intentResult.reasoning)

    // --- LAYER 2: Tool Selection ---
    const candidateTools = findToolsForIntent(intentResult.intent)
    
    // Refine selection based on detected context
    let selectedTools = candidateTools
    
    if (intentResult.detectedGenes.length > 0) {
      // If genes detected, ensure biomarker-analysis is included if available
      const hasBiomarkerTool = selectedTools.some(t => t.toolId === "biomarker-analysis")
      if (!hasBiomarkerTool) {
        const biomarkerCap = getToolCapability("biomarker-analysis")
        if (biomarkerCap) selectedTools.push(biomarkerCap)
      }
    }

    // Prepare arguments for tools (basic mapping for now, to be refined by intent)
    const toolArgs: Record<string, any> = {}
    if (intentResult.detectedGenes.length > 0) {
      toolArgs.geneSymbols = intentResult.detectedGenes
    } else {
      toolArgs.query = prompt // fallback for RAG tools
    }

    reasoningLog.push(`Selected tools: [${selectedTools.map(t => t.toolId).join(", ")}]`)

    // --- LAYER 3: Execution Graph Builder ---
    const executionPlan = buildExecutionGraph(selectedTools, toolArgs)
    reasoningLog.push(`Built execution graph with ${executionPlan.length} stages`)

    // --- LAYER 4: Risk Escalation & Approval ---
    const riskLevel = getMaxRisk(selectedTools.map(t => t.riskLevel))
    const requiresApproval = selectedTools.some(t => t.requiresApproval)
    
    let escalationReason = undefined
    if (requiresApproval) {
      escalationReason = `Tools requiring approval selected: ${selectedTools.filter(t => t.requiresApproval).map(t => t.toolId).join(", ")}`
      reasoningLog.push(`Risk escalated to ${riskLevel}. ${escalationReason}`)
    } else {
      reasoningLog.push(`Risk level assessed at ${riskLevel}. No manual approval required.`)
    }

    const result: PlannerResult = {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      executionPlan,
      riskLevel,
      requiresApproval,
      reasoning: reasoningLog,
      selectedTools: selectedTools.map(t => t.toolId),
      escalationReason
    }

    return result
  }
}

export const clinicalPlanner = new ClinicalPlanner()
