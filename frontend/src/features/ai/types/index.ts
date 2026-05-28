/**
 * src/features/ai/types/index.ts
 * 
 * Core domain types for the AI Runtime and Clinical Copilot.
 */

export type MessageRole = "user" | "assistant" | "system"

export type InferenceStatus =
  | "idle"
  | "thinking"
  | "retrieving"
  | "streaming"
  | "complete"
  | "cancelled"
  | "error"

export interface Citation {
  id: string
  source: string      // e.g., "PubMed", "ClinicalTrials.gov", "Internal Dataset"
  title: string
  url?: string
  relevance: number   // 0.0 to 1.0
  snippet?: string
}

import { PredictionResult } from "../contracts"

export type AIAttachment = 
  | { type: "prediction"; data: PredictionResult }
  | { type: "chart"; data: unknown }
  | { type: "evidence"; data: unknown }

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  citations?: Citation[]
  attachments?: AIAttachment[]
  status?: InferenceStatus
  createdAt: number
}
