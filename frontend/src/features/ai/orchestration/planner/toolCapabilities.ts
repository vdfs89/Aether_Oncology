/**
 * src/features/ai/orchestration/planner/toolCapabilities.ts
 *
 * Layer 2 — Tool Capability Registry
 *
 * Declares the capabilities, risk level, dependencies, and cost
 * of each registered clinical tool. The Planner uses this metadata
 * to select tools and build the execution graph.
 *
 * This is separate from the tool executor registry (tools/registry.ts)
 * to maintain clean separation between "what a tool CAN do" (capability)
 * and "HOW a tool runs" (execution).
 */
import { ToolCapability, ClinicalIntent } from "./types"

// ---------------------------------------------------------------------------
// Tool Capabilities
// ---------------------------------------------------------------------------

const TOOL_CAPABILITIES: ToolCapability[] = [
  {
    toolId: "biomarker-analysis",
    riskLevel: "MODERATE",
    requiresApproval: false,
    requiresPHI: true,
    estimatedLatencyMs: 800,
    cost: "low",
    dependencies: [],
    intents: ["biomarker_analysis", "risk_assessment"]
  },
  {
    toolId: "therapy-matching",
    riskLevel: "HIGH",
    requiresApproval: true,
    requiresPHI: true,
    estimatedLatencyMs: 1200,
    cost: "medium",
    dependencies: ["biomarker-analysis"],
    intents: ["therapy_matching", "biomarker_analysis"]
  },
  {
    toolId: "clinical-guidelines-rag",
    riskLevel: "LOW",
    requiresApproval: false,
    requiresPHI: false,
    estimatedLatencyMs: 600,
    cost: "low",
    dependencies: [],
    intents: [
      "evidence_review",
      "biomarker_analysis",
      "therapy_matching",
      "prognosis",
      "risk_assessment"
    ]
  }
  // Future tools:
  // - "pubmed-rag"           → evidence_review, trial_search
  // - "clinical-trials-api"  → trial_search
  // - "imaging-classifier"   → imaging_analysis
  // - "risk-calculator"      → risk_assessment, prognosis
  // - "drug-interaction"     → therapy_matching, risk_assessment
]

// ---------------------------------------------------------------------------
// Lookup API
// ---------------------------------------------------------------------------

const capabilityMap = new Map<string, ToolCapability>(
  TOOL_CAPABILITIES.map(cap => [cap.toolId, cap])
)

/**
 * Get capability metadata for a specific tool.
 */
export function getToolCapability(toolId: string): ToolCapability | undefined {
  return capabilityMap.get(toolId)
}

/**
 * Find all tools that serve a given clinical intent.
 * Returns tools sorted by risk level (lowest first).
 */
export function findToolsForIntent(intent: ClinicalIntent): ToolCapability[] {
  const riskOrder: Record<string, number> = {
    LOW: 0,
    MODERATE: 1,
    HIGH: 2,
    CRITICAL: 3
  }

  return TOOL_CAPABILITIES
    .filter(cap => cap.intents.includes(intent))
    .sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])
}

/**
 * Returns all registered tool capabilities.
 */
export function getAllToolCapabilities(): ToolCapability[] {
  return [...TOOL_CAPABILITIES]
}
