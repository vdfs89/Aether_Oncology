/**
 * src/features/ai/orchestration/runtime/executionContext.ts
 * 
 * Execution context tracking patient metrics, trace metadata, and runtime duration.
 */
import { ExecutionContext, ClinicalRuntimeState, BaseEventMetadata } from "./types"
import { Citation } from "../../types"

export class ClinicalExecutionContext {
  private context: ExecutionContext

  constructor(patientId: string, sessionId: string, traceId: string, metadata: Record<string, any> = {}) {
    this.context = {
      patientId,
      sessionId,
      traceId,
      startedAt: Date.now(),
      citations: [],
      toolsExecuted: [],
      telemetry: {
        tokensCount: 0
      },
      metadata
    }
  }

  getContext(): ExecutionContext {
    return this.context
  }

  addCitation(citation: Citation): void {
    this.context.citations.push(citation)
  }

  addToolExecution(toolId: string, result: any): void {
    this.context.toolsExecuted.push({ toolId, result })
  }

  setRiskState(riskState: string): void {
    this.context.riskState = riskState
  }

  incrementTokens(count: number): void {
    this.context.telemetry.tokensCount += count
  }

  complete(): void {
    this.context.completedAt = Date.now()
    this.context.durationMs = this.context.completedAt - this.context.startedAt
    this.context.telemetry.latencyMs = this.context.durationMs
  }

  createEventMetadata(currentState: ClinicalRuntimeState): BaseEventMetadata {
    return {
      traceId: this.context.traceId,
      sessionId: this.context.sessionId,
      patientId: this.context.patientId,
      timestamp: Date.now(),
      runtimeState: currentState
    }
  }
}
