/**
 * src/features/ai/orchestration/runtime/stateMachine.ts
 * 
 * Strict state machine controlling transitions during clinical inference.
 */
import { ClinicalRuntimeState } from "./types"

const VALID_TRANSITIONS: Record<ClinicalRuntimeState, ClinicalRuntimeState[]> = {
  IDLE: ["HYDRATING", "PLANNING", "FAILED"],
  HYDRATING: ["IDLE", "PLANNING", "COMPLETED", "FAILED"],
  PLANNING: ["RETRIEVING", "EXECUTING", "STREAMING", "INTERRUPTED", "FAILED"],
  RETRIEVING: ["EXECUTING", "STREAMING", "INTERRUPTED", "FAILED"],
  EXECUTING: ["STREAMING", "WAITING_APPROVAL", "INTERRUPTED", "FAILED"],
  STREAMING: ["COMPLETED", "INTERRUPTED", "FAILED"],
  WAITING_APPROVAL: ["EXECUTING", "INTERRUPTED", "FAILED"],
  INTERRUPTED: ["IDLE", "PLANNING"],
  FAILED: ["IDLE", "PLANNING"],
  COMPLETED: ["IDLE", "PLANNING"]
}

export class ClinicalRuntimeStateMachine {
  private state: ClinicalRuntimeState = "IDLE"
  private onStateChangeCallback?: (from: ClinicalRuntimeState, to: ClinicalRuntimeState) => void

  constructor(initialState?: ClinicalRuntimeState, onStateChange?: (from: ClinicalRuntimeState, to: ClinicalRuntimeState) => void) {
    if (initialState) {
      this.state = initialState
    }
    if (onStateChange) {
      this.onStateChangeCallback = onStateChange
    }
  }

  getState(): ClinicalRuntimeState {
    return this.state
  }

  transitionTo(nextState: ClinicalRuntimeState): void {
    const validNextStates = VALID_TRANSITIONS[this.state]
    if (!validNextStates.includes(nextState)) {
      throw new Error(`Invalid state transition: Cannot transition from ${this.state} to ${nextState}`)
    }

    const previousState = this.state
    this.state = nextState

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(previousState, nextState)
    }
  }
}
