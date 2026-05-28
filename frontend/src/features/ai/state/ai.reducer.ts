/**
 * src/features/ai/state/ai.reducer.ts
 * 
 * Reducer for AI Runtime state.
 * Implements the efficient UPDATE_STREAMING_MESSAGE strategy recommended
 * for mitigating re-render spam during token streaming.
 */
import { AIState, AIAction, SessionState } from "./ai.types"
import { nanoid } from "nanoid"

function updateActiveSession(state: AIState, updateFn: (session: SessionState) => Partial<SessionState>): AIState {
  if (!state.activePatientId) return state
  const session = state.sessionsByPatient[state.activePatientId]
  if (!session) return state

  return {
    ...state,
    sessionsByPatient: {
      ...state.sessionsByPatient,
      [state.activePatientId]: {
        ...session,
        ...updateFn(session)
      }
    }
  }
}

import { generateSessionTitle } from "../history/title-generation/generateSessionTitle"

export function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case "HYDRATE_SESSION": {
      const { patientId, session } = action.payload
      return {
        ...state,
        activePatientId: patientId,
        sessionsByPatient: {
          ...state.sessionsByPatient,
          [patientId]: {
            id: session.id,
            patientId: session.patientId || patientId,
            title: session.title,
            createdAt: session.createdAt || Date.now(),
            updatedAt: session.updatedAt || Date.now(),
            messages: session.messages,
            runtimeState: session.runtimeState || "IDLE",
            eventsLog: session.eventsLog || [],
            inference: {
              status: "idle",
              isStreaming: false,
            }
          }
        }
      }
    }

    case "SWITCH_PATIENT": {
      const { patientId } = action.payload
      // If we don't have a session for this patient yet, create a blank one
      const existingSession = state.sessionsByPatient[patientId]
      const newSessionsByPatient = { ...state.sessionsByPatient }
      
      if (!existingSession) {
        newSessionsByPatient[patientId] = {
          id: nanoid(),
          patientId,
          title: "New Session",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          runtimeState: "IDLE",
          eventsLog: [],
          inference: { status: "idle", isStreaming: false }
        }
      }

      return {
        ...state,
        activePatientId: patientId,
        sessionsByPatient: newSessionsByPatient
      }
    }

    case "SET_SESSION_TITLE": {
      const { patientId, title } = action.payload
      const session = state.sessionsByPatient[patientId]
      if (!session) return state
      return {
        ...state,
        sessionsByPatient: {
          ...state.sessionsByPatient,
          [patientId]: { ...session, title, updatedAt: Date.now() }
        }
      }
    }

    case "ADD_MESSAGE": {
      return updateActiveSession(state, (session) => {
        const isFirstUserMessage = session.messages.length === 0 && action.payload.role === "user"
        const title = isFirstUserMessage 
          ? generateSessionTitle(action.payload.content) 
          : session.title

        return {
          ...session,
          title,
          updatedAt: Date.now(),
          messages: [...session.messages, action.payload]
        }
      })
    }

    case "SET_STATUS":
      return updateActiveSession(state, session => ({
        inference: { ...session.inference, status: action.payload }
      }))

    case "START_INFERENCE":
      return updateActiveSession(state, () => ({
        inference: {
          status: "thinking",
          isStreaming: true,
          activeMessageId: action.payload.messageId,
        }
      }))

    case "UPDATE_STREAMING_MESSAGE":
      return updateActiveSession(state, session => {
        const { activeMessageId } = session.inference
        if (!activeMessageId) return {}

        const msgIndex = session.messages.findIndex(m => m.id === activeMessageId)
        if (msgIndex === -1) return {}

        const activeMsg = session.messages[msgIndex]
        const newCitations = action.payload.citations
          ? [...(activeMsg.citations || []), ...action.payload.citations]
          : activeMsg.citations

        const newAttachments = action.payload.attachments
          ? [...(activeMsg.attachments || []), ...action.payload.attachments]
          : activeMsg.attachments

        const updatedMsg = {
          ...activeMsg,
          content: activeMsg.content + action.payload.contentChunk,
          citations: newCitations,
          attachments: newAttachments,
          status: session.inference.status,
        }

        const newMessages = [...session.messages]
        newMessages[msgIndex] = updatedMsg

        return { 
          messages: newMessages,
          updatedAt: Date.now()
        }
      })

    case "FINISH_INFERENCE":
      return updateActiveSession(state, session => ({
        inference: {
          status: "complete",
          isStreaming: false,
          activeMessageId: undefined,
        }
      }))

    case "CANCEL_INFERENCE":
      return updateActiveSession(state, session => ({
        inference: {
          status: "cancelled",
          isStreaming: false,
          activeMessageId: undefined,
        }
      }))

    case "CLEAR_HISTORY":
      return updateActiveSession(state, () => ({
        messages: [],
        inference: {
          status: "idle",
          isStreaming: false,
          activeMessageId: undefined,
        }
      }))

    case "TRANSITION_STATE":
      return updateActiveSession(state, session => {
        const nextState = action.payload.state
        let status: typeof session.inference.status = "idle"
        let isStreaming = false

        switch (nextState) {
          case "IDLE":
            status = "idle"
            break
          case "HYDRATING":
          case "PLANNING":
          case "WAITING_APPROVAL":
            status = "thinking"
            break
          case "RETRIEVING":
            status = "retrieving"
            break
          case "EXECUTING":
            status = "thinking"
            break
          case "STREAMING":
            status = "streaming"
            isStreaming = true
            break
          case "COMPLETED":
            status = "complete"
            break
          case "INTERRUPTED":
            status = "cancelled"
            break
          case "FAILED":
            status = "error"
            break
        }

        return {
          runtimeState: nextState,
          updatedAt: Date.now(),
          inference: {
            ...session.inference,
            status,
            isStreaming
          }
        }
      })

    case "APPEND_CLINICAL_EVENT":
      return updateActiveSession(state, session => ({
        eventsLog: [...session.eventsLog, action.payload.event],
        updatedAt: Date.now()
      }))

    default:
      return state
  }
}
