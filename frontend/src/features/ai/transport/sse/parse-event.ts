import { safeParseAIStreamEvent } from "../protocol/guards"
import { AIStreamEvent } from "../protocol/protocol"

/**
 * Parses a raw SSE data string (e.g. from `data: {...}`) into an AIStreamEvent.
 * Returns null if the payload is unparseable or fails validation.
 */
export function parseSSEEventData(dataStr: string): AIStreamEvent | null {
  try {
    const parsedJson = JSON.parse(dataStr)
    const result = safeParseAIStreamEvent(parsedJson)
    
    if (result.success) {
      return result.data
    } else {
      // In a real scenario, we might want to log this to our security/telemetry logger
      console.warn("[parseSSEEventData] Zod validation failed:", result.error.message)
      return null
    }
  } catch (err) {
    console.warn("[parseSSEEventData] Invalid JSON payload:", dataStr)
    return null
  }
}
