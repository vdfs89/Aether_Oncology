/**
 * src/features/ai/api/mock.provider.ts
 * 
 * Mock Provider implementation fetching from local SSE chat route.
 */
import { LLMProvider, StreamInput, ProviderCapabilities, ProviderHealth } from "./types"
import { AIStreamEvent } from "../transport/protocol/protocol"
import { readAIStream } from "../transport/sse/stream-reader"

export class MockProvider implements LLMProvider {
  id = "mock"
  name = "Mock Clinical Streamer"
  
  capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    multimodal: true,
    jsonMode: true,
    reasoning: true,
    maxContextTokens: 32000
  }

  async *stream(input: StreamInput): AsyncGenerator<AIStreamEvent, void, unknown> {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.patientId ? { "X-Patient-Id": input.patientId } : {})
      },
      body: JSON.stringify({ messages: input.messages }),
      signal: input.signal
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    yield* readAIStream(response.body, input.signal)
  }

  async health(): Promise<ProviderHealth> {
    return {
      status: "healthy",
      latencyMs: 5
    }
  }
}
