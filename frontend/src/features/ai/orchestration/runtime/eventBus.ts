/**
 * src/features/ai/orchestration/runtime/eventBus.ts
 * 
 * Decoupled event bus to propagate events between tool executions, UI and telemetry.
 */
import { ClinicalRuntimeEvent, BaseEventMetadata } from "./types"

type Listener<T extends ClinicalRuntimeEvent["type"]> = (
  payload: Extract<ClinicalRuntimeEvent, { type: T }>["payload"],
  metadata: BaseEventMetadata
) => void

export class ClinicalEventBus {
  private listeners: { [K in ClinicalRuntimeEvent["type"]]?: Array<Listener<any>> } = {}

  subscribe<T extends ClinicalRuntimeEvent["type"]>(
    type: T,
    callback: Listener<T>
  ): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    
    this.listeners[type]!.push(callback)

    // Return unsubscribe function
    return () => {
      if (this.listeners[type]) {
        this.listeners[type] = this.listeners[type]!.filter(cb => cb !== callback)
      }
    }
  }

  publish(event: ClinicalRuntimeEvent): void {
    const eventListeners = this.listeners[event.type]
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(event.payload, event.metadata)
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err)
        }
      })
    }
  }
}

export const clinicalEventBus = new ClinicalEventBus()
