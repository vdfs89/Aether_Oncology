import { AIStreamEvent } from "../transport/protocol/protocol"
import { readAIStream } from "../transport/sse/stream-reader"

export interface ChatRequestOptions {
  messages: any[] // We will type this properly later (e.g. Omit<AIMessage, 'id'>)
  signal?: AbortSignal
  patientId?: string
}

/**
 * Sends a chat request to the proxy API and yields AIStreamEvents.
 */
export async function* streamChat(options: ChatRequestOptions): AsyncGenerator<AIStreamEvent, void, unknown> {
  const { messages, signal, patientId } = options

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(patientId ? { "X-Patient-Id": patientId } : {})
    },
    body: JSON.stringify({ messages }),
    signal
  })

  if (!response.ok) {
    // In a real scenario, parse the error JSON to extract ClinicalError
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  // Iterate over the stream reader
  yield* readAIStream(response.body, signal)
}
