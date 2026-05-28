/**
 * src/features/ai/api/openai-compatible.provider.ts
 * 
 * Base provider class for all OpenAI-compatible API layers (Groq, Together, DeepInfra, etc.)
 */
import { LLMProvider, StreamInput, ProviderCapabilities, ProviderHealth } from "./types"
import { AIStreamEvent } from "../transport/protocol/protocol"
import { readAIStream } from "../transport/sse/stream-reader"

export class OpenAICompatibleProvider implements LLMProvider {
  id = "openai-compatible"
  name = "OpenAI Compatible Endpoint"
  apiUrl = "/api/chat"

  capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    multimodal: false,
    jsonMode: true,
    reasoning: false,
    maxContextTokens: 128000
  }

  constructor(apiUrl?: string) {
    if (apiUrl) {
      this.apiUrl = apiUrl
    }
  }

  async *stream(input: StreamInput): AsyncGenerator<AIStreamEvent, void, unknown> {
    const bodyPayload = { 
      messages: input.messages,
      context: {}, // TODO: pass context from ClinicalExecutionContext
      task: {
        intent: "conversational",
        risk_level: "LOW"
      }
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.patientId ? { "X-Patient-Id": input.patientId } : {})
      },
      body: JSON.stringify(bodyPayload),
      signal: input.signal
    })

    if (!response.ok) {
      throw new Error(`${this.name} API Error: ${response.status} ${response.statusText}`)
    }

    yield* readAIStream(response.body, input.signal)
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now()
    try {
      // Simulate/perform health options request with a tight timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const response = await fetch(this.apiUrl, {
        method: "OPTIONS",
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      return {
        status: response.ok ? "healthy" : "degraded",
        latencyMs: Date.now() - start
      }
    } catch {
      return {
        status: "offline"
      }
    }
  }
}
