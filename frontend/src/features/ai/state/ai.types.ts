/**
 * src/features/ai/state/ai.types.ts
 * 
 * Defines the structure of the AI Runtime state and the actions
 * that can mutate it.
 */
import { AIMessage, InferenceStatus, Citation, AIAttachment } from "../types"
import { ConversationSession } from "../services/persistence/db"
import { ClinicalRuntimeState, ClinicalRuntimeEvent } from "../orchestration/runtime/types"

export interface SessionState extends ConversationSession {
  runtimeState: ClinicalRuntimeState
  eventsLog: ClinicalRuntimeEvent[]
  inference: {
    status: InferenceStatus
    isStreaming: boolean
    activeMessageId?: string
  }
}

export interface AIState {
  activePatientId: string | null
  sessionsByPatient: Record<string, SessionState>
}

export type AIAction =
  | { type: "HYDRATE_SESSION"; payload: { patientId: string; session: ConversationSession } }
  | { type: "SWITCH_PATIENT"; payload: { patientId: string } }
  | { type: "SET_SESSION_TITLE"; payload: { patientId: string; title: string } }
  | { type: "ADD_MESSAGE"; payload: AIMessage }
  | { type: "SET_STATUS"; payload: InferenceStatus }
  | { type: "START_INFERENCE"; payload: { messageId: string } }
  | { type: "UPDATE_STREAMING_MESSAGE"; payload: { contentChunk: string; citations?: Citation[]; attachments?: AIAttachment[] } }
  | { type: "FINISH_INFERENCE" }
  | { type: "CANCEL_INFERENCE" }
  | { type: "CLEAR_HISTORY" }
  | { type: "TRANSITION_STATE"; payload: { state: ClinicalRuntimeState } }
  | { type: "APPEND_CLINICAL_EVENT"; payload: { event: ClinicalRuntimeEvent } }
