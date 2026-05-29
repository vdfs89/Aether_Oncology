/**
 * src/features/ai/hooks/useStreaming.ts
 *
 * High-level hook to manage the lifecycle of a single AI inference request.
 * Integrated with:
 *   - ClinicalRuntimeStateMachine (deterministic state transitions)
 *   - ClinicalEventBus (decoupled event propagation)
 *   - ClinicalToolRuntime (DAG-based tool execution with retries/timeouts)
 *   - LLMProvider abstraction (provider-agnostic streaming)
 */
import { useRef, useCallback } from "react"
import { useAI } from "./useAI"
import { getLLMProvider } from "../api/factory"
import { nanoid } from "nanoid"
import { ClinicalExecutionContext } from "../orchestration/runtime/executionContext"
import { ClinicalRuntimeStateMachine } from "../orchestration/runtime/stateMachine"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { clinicalToolRuntime } from "../tools/runtime"
import { ExecutionPlan, ExecutionStage } from "../tools/types"
import { clinicalPlanner } from "../orchestration/planner"
import { clinicalApprovalManager } from "../orchestration/runtime/approvalManager"
import { scrubPHI } from "../telemetry/scrubbers/phi"

export function useStreaming() {
  const {
    _startAssistantStreaming,
    _updateStreamingChunk,
    _finishInference,
    state
  } = useAI()

  const abortControllerRef = useRef<AbortController | null>(null)

  const triggerInference = useCallback(
    async (assistantMessageId: string, prompt: string) => {
      const session = state.activePatientId
        ? state.sessionsByPatient[state.activePatientId]
        : null
      if (!session) return
      if (session.inference.isStreaming) return

      const patientId = state.activePatientId || "test-patient"
      const sessionId = session.id
      const traceId = nanoid()

      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // 1. Execution context & state machine
      const context = new ClinicalExecutionContext(patientId, sessionId, traceId)
      const stateMachine = new ClinicalRuntimeStateMachine("IDLE", (from, to) => {
        clinicalEventBus.publish({
          type: "StateTransition",
          payload: { from, to },
          metadata: context.createEventMetadata(to)
        })
      })

      // Fail-closed PHI scrubber check
      let scrubbedPrompt = prompt
      try {
        scrubbedPrompt = scrubPHI(prompt)
      } catch (scrubErr: any) {
        console.error("PHI Scrubber failed (Fail-closed). Aborting inference.", scrubErr)
        stateMachine.transitionTo("FAILED")
        clinicalEventBus.publish({
          type: "InferenceFailed",
          payload: { error: `Security exception: PHI Scrubber error. ${scrubErr.message || String(scrubErr)}` },
          metadata: context.createEventMetadata("FAILED")
        })
        _finishInference()
        return
      }

      try {
        // Announce message creation
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

        // HYDRATING → PLANNING
        stateMachine.transitionTo("HYDRATING")
        await new Promise(r => setTimeout(r, 250))
        stateMachine.transitionTo("PLANNING")

        _startAssistantStreaming(assistantMessageId)

        // -----------------------------------------------------------------
        // 2. Build an ExecutionPlan based on prompt analysis
        // -----------------------------------------------------------------
        const plannerResult = clinicalPlanner.plan(scrubbedPrompt, context.getContext())
        
        // Always emit the planning result for telemetry / UI visualization
        clinicalEventBus.publish({
          type: "StateTransition", // Mapping to generic for now, could be PlanBuilt
          payload: { from: "PLANNING", to: "RETRIEVING" }, // Fast-forward representation
          metadata: context.createEventMetadata("PLANNING") // Keep state in PLANNING during emission
        })

        if (plannerResult.requiresApproval) {
          stateMachine.transitionTo("WAITING_APPROVAL")
          
          // Pause execution indefinitely until the physician decides
          const decision = await clinicalApprovalManager.requestApproval(
            plannerResult.executionPlan,
            plannerResult.riskLevel,
            plannerResult.reasoning,
            context
          )

          if (decision === "REJECTED") {
            stateMachine.transitionTo("INTERRUPTED")
            _finishInference()
            return
          }
        }

        if (plannerResult.executionPlan.length > 0) {
          // RETRIEVING phase
          stateMachine.transitionTo("RETRIEVING")
          clinicalEventBus.publish({
            type: "RetrievalStarted",
            payload: { query: `Intent: ${plannerResult.intent}. Reasoning: ${plannerResult.reasoning[0]}` },
            metadata: context.createEventMetadata("RETRIEVING")
          })
          await new Promise(r => setTimeout(r, 600))

          // EXECUTING phase — run through the Tool Runtime Engine
          stateMachine.transitionTo("EXECUTING")

          // Execute the full plan through the runtime engine
          const results = await clinicalToolRuntime.executePlan(
            plannerResult.executionPlan,
            context.getContext(),
            signal
          )

          // Record successful tool executions in the context
          results.forEach((result, idx) => {
            const flatTools = plannerResult.executionPlan.flatMap((s: ExecutionStage) => s.tools)
            if (result.success && flatTools[idx]) {
              context.addToolExecution(flatTools[idx].toolId, result.data)
            }
          })

          // Publish aggregated ToolExecuted event
          const biomarkerResult = results.find(r => r.success && (r.data as any)?.biomarkers)
          if (biomarkerResult) {
            clinicalEventBus.publish({
              type: "ToolExecuted",
              payload: {
                toolId: "biomarker-analysis",
                result: biomarkerResult.data
              },
              metadata: context.createEventMetadata("EXECUTING")
            })
          }
        }

        // -----------------------------------------------------------------
        // 3. STREAMING phase — LLM token generation
        // -----------------------------------------------------------------
        stateMachine.transitionTo("STREAMING")

        const messages = session.messages.concat([
          { id: "temp", role: "user", content: scrubbedPrompt, createdAt: Date.now() }
        ])
        const provider = getLLMProvider()
        const stream = provider.stream({
          messages,
          signal,
          patientId
        })

        for await (const event of stream) {
          if (signal.aborted) {
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

        // Complete
        if (stateMachine.getState() === "STREAMING") {
          context.complete()
          stateMachine.transitionTo("COMPLETED")
          clinicalEventBus.publish({
            type: "StreamCompleted",
            payload: {
              totalTokens: context.getContext().telemetry.tokensCount
            },
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
    },
    [state, _startAssistantStreaming, _updateStreamingChunk, _finishInference]
  )

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
