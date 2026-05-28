import { parseSSEEventData } from "./parse-event"
import { AIStreamEvent } from "../protocol/protocol"

/**
 * Consumes a fetch ReadableStream as an async iterable of AIStreamEvent.
 * Handles chunking, decoding, and SSE line splitting.
 */
export async function* readAIStream(
  stream: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal
): AsyncGenerator<AIStreamEvent, void, unknown> {
  if (!stream) return

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      if (signal?.aborted) {
        break
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")

      // Keep the last partial line in the buffer
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(6).trim()
          
          if (dataStr === "[DONE]") {
            // Optional standard SSE completion marker
            continue
          }

          const event = parseSSEEventData(dataStr)
          if (event) {
            yield event
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
