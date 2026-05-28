/**
 * src/features/ai/hooks/useStreaming.ts
 * 
 * High-level hook to manage the lifecycle of a single AI inference request.
 * Now integrated with the EventBus, State Machine, and Tools Orchestration.
 */
import { useRef, useCallback } from "react"
import { useAI } from "./useAI"
import { getLLMProvider } from "../api/factory"
import { nanoid } from "nanoid"
import { ClinicalExecutionContext } from "../orchestration/runtime/executionContext"
import { ClinicalRuntimeStateMachine } from "../orchestration/runtime/stateMachine"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { biomarkerAnalysisTool } from "../tools/registry"

export function useStreaming() {
  const { 
    _startAssistantStreaming, 
    _updateStreamingChunk, 
    _finishInference,
    state 
  } = useAI()
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const triggerInference = useCallback(async (assistantMessageId: string, prompt: string) => {
    const session = state.activePatientId ? state.sessionsByPatient[state.activePatientId] : null
    if (!session) return
    if (session.inference.isStreaming) return

    const patientId = state.activePatientId || "test-patient"
    const sessionId = session.id
    const traceId = nanoid() // Unique trace for this run

    // Setup cancellation token
    abortControllerRef.current = new AbortController()

    // 1. Setup execution context and state machine
    const context = new ClinicalExecutionContext(patientId, sessionId, traceId)
    const stateMachine = new ClinicalRuntimeStateMachine("IDLE", (from, to) => {
      // Publish StateTransition to EventBus
      clinicalEventBus.publish({
        type: "StateTransition",
        payload: { from, to },
        metadata: context.createEventMetadata(to)
      })
    })

    try {
      // Publish the user's message start
      clinicalEventBus.publish({
        type: "MessageCreated",
        payload: {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          status: "thinking"
        },
        metadata: context.createEventMetadata("IDLE")
      })

      // Transition to HYDRATING (session/state hydration check)
      stateMachine.transitionTo("HYDRATING")
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulation delay

      // Transition to PLANNING
      stateMachine.transitionTo("PLANNING")
      
      // Start streaming message in reducer (creates visual slot)
      _startAssistantStreaming(assistantMessageId)

      // 2. Decide if we need to execute a tool (e.g. biomarker-analysis)
      const promptLower = prompt.toLowerCase()
      const detectsGenes = ["brca1", "her2", "tp53", "erbb2", "biomarker"].some(word => promptLower.includes(word))

      if (detectsGenes) {
        // Transition to RETRIEVING (RAG / Data retrieval stage)
        stateMachine.transitionTo("RETRIEVING")
        clinicalEventBus.publish({
          type: "RetrievalStarted",
          payload: { query: `Genomic alterations for ${prompt}` },
          metadata: context.createEventMetadata("RETRIEVING")
        })
        
        await new Promise(resolve => setTimeout(resolve, 800)) // Retrieval latency simulation

        // Transition to EXECUTING (tool execution stage)
        stateMachine.transitionTo("EXECUTING")

        // Parse query to see which genes the user wants
        const queriedGenes: string[] = []
        if (promptLower.includes("brca1")) queriedGenes.push("BRCA1")
        if (promptLower.includes("her2") || promptLower.includes("erbb2")) queriedGenes.push("HER2")
        if (promptLower.includes("tp53")) queriedGenes.push("TP53")
        if (queriedGenes.length === 0) queriedGenes.push("BRCA1", "HER2", "TP53") // Default

        // Execute biomarker-analysis tool
        const toolResult = await biomarkerAnalysisTool.execute({ geneSymbols: queriedGenes }, context.getContext())
        context.addToolExecution(biomarkerAnalysisTool.id, toolResult)
        
        await new Promise(resolve => setTimeout(resolve, 600)) // Execution latency simulation
      }

      // Transition to STREAMING
      stateMachine.transitionTo("STREAMING")

      // 3. Trigger LLM Stream Chat via Server-Sent Events (SSE)
      // Concat user message temporarily for context
      const messages = session.messages.concat([{ id: "temp", role: "user", content: prompt, createdAt: Date.now() }])
      const provider = getLLMProvider()
      const stream = provider.stream({
        messages,
        signal: abortControllerRef.current.signal,
        patientId: patientId
      })

      for await (const event of stream) {
        if (abortControllerRef.current.signal.aborted) {
          stateMachine.transitionTo("INTERRUPTED")
          break
        }

        switch (event.type) {
          case "token":
            _updateStreamingChunk(event.chunk)
            context.incrementTokens(1)
            break
          case "citation":
            _updateStreamingChunk("", [event.citation])
            context.addCitation(event.citation)
            clinicalEventBus.publish({
              type: "CitationAttached",
              payload: event.citation,
              metadata: context.createEventMetadata("STREAMING")
            })
            break
          case "error":
            console.error("Clinical Inference Error:", event.error)
            stateMachine.transitionTo("FAILED")
            clinicalEventBus.publish({
              type: "InferenceFailed",
              payload: { error: event.error.message },
              metadata: context.createEventMetadata("FAILED")
            })
            break
        }
      }

      if (stateMachine.getState() === "STREAMING") {
        context.complete()
        stateMachine.transitionTo("COMPLETED")
        clinicalEventBus.publish({
          type: "StreamCompleted",
          payload: { totalTokens: context.getContext().telemetry.tokensCount },
          metadata: context.createEventMetadata("COMPLETED")
        })
        _finishInference()
      }

    } catch (e: any) {
      if (e.name === "AbortError") {
        stateMachine.transitionTo("INTERRUPTED")
      } else {
        console.error("Stream Failed:", e)
        stateMachine.transitionTo("FAILED")
        clinicalEventBus.publish({
          type: "InferenceFailed",
          payload: { error: e.message || String(e) },
          metadata: context.createEventMetadata("FAILED")
        })
      }
      _finishInference()
    }

  }, [state, _startAssistantStreaming, _updateStreamingChunk, _finishInference])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    triggerInference,
    cancel
  }
}
