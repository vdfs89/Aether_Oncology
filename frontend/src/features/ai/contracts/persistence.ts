/**
 * src/features/ai/contracts/persistence.ts
 * 
 * Persistence contracts for the AI subsystem.
 * Defines the structure for ConversationSession, PatientContext, and InferenceTrace.
 */

import { AIMessage } from "../types"

export interface PatientContext {
  id: string
  ageRange?: string
  gender?: string
  primaryDiagnosis?: string
  stage?: string
  biomarkers?: string[] // e.g., ["HER2+", "ER+", "PR-"]
  recentLabResults?: Record<string, string | number>
}

export interface InferenceTrace {
  id: string
  messageId: string
  modelId: string
  modelVersion: string
  latencyMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cacheHit: boolean
  timestamp: number
}

export interface ConversationSession {
  sessionId: string
  patientId?: string
  title?: string
  createdAt: number
  updatedAt: number
  messages: AIMessage[]
  // Medico-legal tracing
  traces?: InferenceTrace[]
  status: "active" | "archived" | "requires_review"
}
