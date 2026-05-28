/**
 * src/features/ai/hooks/useAI.ts
 * 
 * Custom hook to consume the AI Context and provide selectors
 * to prevent unnecessary re-renders.
 */
import { useContext } from "react"
import { AIContext } from "../providers/AIProvider"
import { AIMessage, InferenceStatus } from "../types"

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error("useAI must be used within an AIProvider")
  }
  return context
}

// ── Selectors ─────────────────────────────────────────────────────────────────

export function useActiveSession() {
  const { state } = useAI()
  if (!state.activePatientId) return null
  return state.sessionsByPatient[state.activePatientId] || null
}

export function useMessages(): AIMessage[] {
  const session = useActiveSession()
  return session?.messages || []
}

export function useInferenceStatus(): InferenceStatus {
  const session = useActiveSession()
  return session?.inference.status || "idle"
}

export function useIsStreaming(): boolean {
  const session = useActiveSession()
  return session?.inference.isStreaming || false
}

export function useActiveMessageId(): string | undefined {
  const session = useActiveSession()
  return session?.inference.activeMessageId
}
