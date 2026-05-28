/**
 * src/features/ai/providers/AIProvider.tsx
 * 
 * Thin wrapper providing AI state and actions via Context.
 */
"use client"

import * as React from "react"
import { useReducer, useMemo, useCallback } from "react"
import { AIState, AIAction } from "../state/ai.types"
import { initialAIState } from "../state/ai.initial"
import { aiReducer } from "../state/ai.reducer"
import * as actions from "../state/ai.actions"
import { AIMessage, InferenceStatus, Citation, AIAttachment } from "../types"
import { nanoid } from "nanoid"
import { useSessionHydration } from "../hooks/useSessionHydration"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { ClinicalRuntimeEvent } from "../orchestration/runtime/types"

interface AIContextValue {
  state: AIState
  dispatch: React.Dispatch<AIAction>
  // High-level actions exposed to UI
  sendMessage: (content: string) => void
  cancelInference: () => void
  clearHistory: () => void
  // Internal/advanced actions
  _startAssistantStreaming: (messageId: string) => void
  _updateStreamingChunk: (contentChunk: string, citations?: Citation[], attachments?: AIAttachment[]) => void
  _setInferenceStatus: (status: InferenceStatus) => void
  _finishInference: () => void
}

export const AIContext = React.createContext<AIContextValue | null>(null)

// We need to move the original provider content to AIStateProvider

// A wrapper to use hydration so that context is available
export function AIProvider({ children }: { children: React.ReactNode }) {
  return (
    <AIStateProvider>
      <AIHydrationLayer>
        {children}
      </AIHydrationLayer>
    </AIStateProvider>
  )
}

function AIStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiReducer, initialAIState)

  React.useEffect(() => {
    // For now, auto-switch to a default patient if none is active
    if (!state.activePatientId) {
      dispatch(actions.switchPatient("test-patient"))
    }
  }, [state.activePatientId])

  React.useEffect(() => {
    // Subscribe to state transitions
    const unsubTransition = clinicalEventBus.subscribe("StateTransition", (payload) => {
      dispatch(actions.transitionState(payload.to))
    })

    // Translate tool execution results into message attachments
    const unsubTool = clinicalEventBus.subscribe("ToolExecuted", (payload) => {
      const toolResult = payload.result
      const attachment: AIAttachment = {
        type: "evidence",
        data: {
          title: `Biomarker Run: ${payload.toolId.toUpperCase()}`,
          source: toolResult.metadata.source || "biomarker-analysis-runtime",
          biomarkers: toolResult.data?.biomarkers || [],
          summary: toolResult.data?.recommendationSummary || ""
        }
      }
      dispatch(actions.updateStreamingMessage("", undefined, [attachment]))
    })

    // List of events to append to the historical event log
    const eventTypes: Array<ClinicalRuntimeEvent["type"]> = [
      "MessageCreated",
      "RetrievalStarted",
      "CitationAttached",
      "ToolExecuted",
      "ToolStarted",
      "ToolCompleted",
      "ToolFailed",
      "PredictionGenerated",
      "StreamCompleted",
      "InferenceFailed",
      "StateTransition"
    ]
    
    const unsubs = eventTypes.map(type => 
      clinicalEventBus.subscribe(type, (payload, metadata) => {
        dispatch(actions.appendClinicalEvent({ type, payload, metadata } as ClinicalRuntimeEvent))
      })
    )

    return () => {
      unsubTransition()
      unsubTool()
      unsubs.forEach(unsub => unsub())
    }
  }, [dispatch])

  const sendMessage = useCallback((content: string) => {
    // 1. Add user message
    const userMsg: AIMessage = {
      id: nanoid(),
      role: "user",
      content,
      createdAt: Date.now(),
    }
    dispatch(actions.addMessage(userMsg))

    // 2. Add placeholder assistant message
    const assistantMsgId = nanoid()
    const assistantMsg: AIMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      status: "idle",
      createdAt: Date.now() + 1, // Ensure stable sort
    }
    dispatch(actions.addMessage(assistantMsg))
  }, [])

  const cancelInference = useCallback(() => {
    dispatch(actions.cancelInference())
  }, [])

  const clearHistory = useCallback(() => {
    dispatch(actions.clearHistory())
  }, [])

  const _startAssistantStreaming = useCallback((messageId: string) => {
    dispatch(actions.startInference(messageId))
  }, [])

  const _updateStreamingChunk = useCallback((contentChunk: string, citations?: Citation[], attachments?: AIAttachment[]) => {
    dispatch(actions.updateStreamingMessage(contentChunk, citations, attachments))
  }, [])

  const _setInferenceStatus = useCallback((status: InferenceStatus) => {
    dispatch(actions.setStatus(status))
  }, [])

  const _finishInference = useCallback(() => {
    dispatch(actions.finishInference())
  }, [])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      sendMessage,
      cancelInference,
      clearHistory,
      _startAssistantStreaming,
      _updateStreamingChunk,
      _setInferenceStatus,
      _finishInference,
    }),
    [state, sendMessage, cancelInference, clearHistory, _startAssistantStreaming, _updateStreamingChunk, _setInferenceStatus, _finishInference]
  )

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

function AIHydrationLayer({ children }: { children: React.ReactNode }) {
  useSessionHydration()
  return <>{children}</>
}
