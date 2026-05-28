/**
 * src/features/ai/contracts/index.ts
 * 
 * Defines the strict data contracts for clinical predictive intelligence.
 * These interfaces will be filled by the real backend/XAI in Phase 3.
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "REQUIRES_REVIEW"

export interface Biomarker {
  id: string
  name: string
  value: number
  trend: "up" | "down" | "stable"
  referenceRange: [number, number]
  unit: string
}

export interface ExplainabilityData {
  features: { name: string; impact: number }[] // For SHAP breakdown
  confidenceScore: number // 0.0 to 1.0
  driftScore?: number
}

export interface RiskAssessment {
  level: RiskLevel
  score: number
  primaryFactors: string[]
  recommendedAction?: string // e.g. "Recommend oncological review within 14 days"
}

export interface PredictionResult {
  id: string
  timestamp: number
  modelVersion?: string
  generatedBy?: string // e.g., "Aether Foundation Model v2"

  risk: RiskAssessment
  biomarkers: Biomarker[]
  explainability: ExplainabilityData
}
