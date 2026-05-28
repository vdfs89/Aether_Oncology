/**
 * src/features/ai/theme/semantic.ts
 * 
 * Semantic severity tokens for the Clinical Intelligence Platform.
 * Ensures consistent color, border, and background treatments across
 * RiskPanels, ErrorSurfaces, DriftWarnings, and ModelAlerts.
 */

export type SemanticSeverity = 
  | "SAFE" 
  | "INFO" 
  | "WARNING" 
  | "CRITICAL" 
  | "REQUIRES_REVIEW" 
  | "LOW_CONFIDENCE"

export const semanticTheme: Record<SemanticSeverity, { color: string; border: string; bg: string }> = {
  SAFE: {
    color: "text-emerald-400",
    border: "border-emerald-900/50",
    bg: "bg-emerald-950/20"
  },
  INFO: {
    color: "text-cyan-400",
    border: "border-cyan-900/50",
    bg: "bg-cyan-950/20"
  },
  WARNING: {
    color: "text-amber-400",
    border: "border-amber-900/50",
    bg: "bg-amber-950/20"
  },
  CRITICAL: {
    color: "text-rose-400",
    border: "border-rose-900/50",
    bg: "bg-rose-950/20"
  },
  REQUIRES_REVIEW: {
    color: "text-purple-400",
    border: "border-purple-900/50",
    bg: "bg-purple-950/20"
  },
  LOW_CONFIDENCE: {
    color: "text-neutral-400",
    border: "border-neutral-800",
    bg: "bg-neutral-900/50"
  }
}
