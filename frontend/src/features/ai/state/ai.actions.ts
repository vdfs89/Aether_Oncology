/**
 * src/features/ai/state/ai.actions.ts
 * 
 * Helper action creators for the AI Reducer.
 */
import { AIMessage, InferenceStatus, Citation, AIAttachment } from "../types"
import { AIAction } from "./ai.types"
import { ConversationSession } from "../services/persistence/db"
import { ClinicalRuntimeState, ClinicalRuntimeEvent } from "../orchestration/runtime/types"

export const hydrateSession = (patientId: string, session: ConversationSession): AIAction => ({
  type: "HYDRATE_SESSION",
  payload: { patientId, session }
})

export const switchPatient = (patientId: string): AIAction => ({
  type: "SWITCH_PATIENT",
  payload: { patientId }
})

export const setSessionTitle = (patientId: string, title: string): AIAction => ({
  type: "SET_SESSION_TITLE",
  payload: { patientId, title }
})

export const addMessage = (message: AIMessage): AIAction => ({
  type: "ADD_MESSAGE",
  payload: message,
})

export const setStatus = (status: InferenceStatus): AIAction => ({
  type: "SET_STATUS",
  payload: status,
})

export const startInference = (messageId: string): AIAction => ({
  type: "START_INFERENCE",
  payload: { messageId },
})

export const updateStreamingMessage = (contentChunk: string, citations?: Citation[], attachments?: AIAttachment[]): AIAction => ({
  type: "UPDATE_STREAMING_MESSAGE",
  payload: { contentChunk, citations, attachments },
})

export const finishInference = (): AIAction => ({
  type: "FINISH_INFERENCE",
})

export const cancelInference = (): AIAction => ({
  type: "CANCEL_INFERENCE",
})

export const clearHistory = (): AIAction => ({
  type: "CLEAR_HISTORY",
})

export const transitionState = (state: ClinicalRuntimeState): AIAction => ({
  type: "TRANSITION_STATE",
  payload: { state }
})

export const appendClinicalEvent = (event: ClinicalRuntimeEvent): AIAction => ({
  type: "APPEND_CLINICAL_EVENT",
  payload: { event }
})
