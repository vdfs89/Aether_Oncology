/**
 * AIGateway — Transport layer connecting Next.js to the FastAPI Clinical Runtime.
 *
 * Architecture:
 *   Frontend clinicalEventBus
 *       ↑
 *   AIGateway (this file)
 *       ↑  fetch + ReadableStream (SSE)
 *   FastAPI /api/v1/clinical/chat
 *       ↑
 *   ClinicalInferenceRuntime (Python)
 *
 * Validation: every SSE event is parsed and validated via AIStreamEventSchema (Zod).
 * Routing: validated events are emitted directly into clinicalEventBus.
 * Resilience: exponential backoff retry on connection failures (max 3 attempts).
 */

import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { AIStreamEventSchema } from "../transport/protocol/protocol"


const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const CHAT_ENDPOINT = `${BASE_URL}/api/v1/clinical/chat`

export interface GatewayPayload {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  context?: Record<string, unknown>
  task?: {
    intent?: string
    risk_level?: string
    needs_reasoning?: boolean
    needs_low_latency?: boolean
    needs_multimodal?: boolean
  }
  sessionId?: string
  patientId?: string
}

export interface GatewayCallbacks {
  onEvent?: (event: unknown) => void
  onDone?: () => void
  onError?: (err: Error) => void
}

/**
 * Stream a clinical chat request from the FastAPI backend.
 * Parses each SSE line, validates with Zod, and emits to the clinical event bus.
 */
export async function streamClinicalChat(
  payload: GatewayPayload,
  callbacks: GatewayCallbacks = {},
  retryAttempt = 0
): Promise<void> {
  const MAX_RETRIES = 3
  const { onEvent, onDone, onError } = callbacks

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error("Response body is null — SSE stream unavailable")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE lines are delimited by \n\n
      const lines = buffer.split("\n\n")
      // Keep the last potentially incomplete chunk in the buffer
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue

        const rawJson = trimmed.slice("data:".length).trim()
        if (!rawJson) continue

        try {
          const parsed = JSON.parse(rawJson)
          const result = AIStreamEventSchema.safeParse(parsed)

          if (result.success) {
            const event = result.data
            // Publish to the clinical event bus — feeds the entire UI runtime
            // The SSE event shape from the backend maps to ClinicalRuntimeEvent payload
            try {
              clinicalEventBus.publish({
                type: event.type as any,
                payload: event as any,
                metadata: {
                  traceId: (event as any).traceId ?? "gateway",
                  sessionId: (event as any).sessionId ?? "gateway",
                  patientId: (event as any).patientId ?? "unknown",
                  timestamp: Date.now(),
                  runtimeState: "EXECUTING" as any,
                }
              } as any)
            } catch (busErr) {
              console.warn("[AIGateway] Event bus publish failed:", busErr)
            }
            onEvent?.(event)
          } else {
            // Unknown event shape — forward raw for forward compatibility
            if (parsed?.type) {
              try {
                clinicalEventBus.publish({
                  type: parsed.type,
                  payload: parsed,
                  metadata: {
                    traceId: parsed.traceId ?? "gateway",
                    sessionId: parsed.sessionId ?? "gateway",
                    patientId: parsed.patientId ?? "unknown",
                    timestamp: Date.now(),
                    runtimeState: "EXECUTING" as any,
                  }
                } as any)
              } catch { /* non-critical */ }
              onEvent?.(parsed)
            }
            console.warn("[AIGateway] Unvalidated SSE event:", parsed?.type, result.error?.issues?.[0])
          }
        } catch (parseErr) {
          console.error("[AIGateway] Failed to parse SSE line:", rawJson, parseErr)
        }
      }
    }

    onDone?.()

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))

    if (retryAttempt < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryAttempt) * 500 // 500ms, 1s, 2s
      console.warn(`[AIGateway] Connection error — retry ${retryAttempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`, error.message)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
      return streamClinicalChat(payload, callbacks, retryAttempt + 1)
    }

    console.error("[AIGateway] Max retries reached. Fatal error:", error)
    onError?.(error)

    // Publish an error event to the bus so the UI shows the failure state
    try {
      clinicalEventBus.publish({
        type: "InferenceFailed",
        payload: { error: error.message },
        metadata: {
          traceId: "gateway-error",
          sessionId: "unknown",
          patientId: "unknown",
          timestamp: Date.now(),
          runtimeState: "ERROR" as any,
        }
      } as any)
    } catch { /* non-critical */ }
  }
}

/**
 * Convenience: check if the FastAPI backend is reachable.
 */
export async function pingClinicalBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: "GET" })
    return res.ok
  } catch {
    return false
  }
}
