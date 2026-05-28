/**
 * src/features/ai/state/ai.initial.ts
 * 
 * Initial state definition for the AI Runtime.
 */
import { AIState } from "./ai.types"

export const initialAIState: AIState = {
  activePatientId: null,
  sessionsByPatient: {},
}
