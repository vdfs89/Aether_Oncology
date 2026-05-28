import { AIStreamEvent } from "../transport/protocol/protocol"

export type LLMProviderError =
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_RESPONSE"
  | "PROVIDER_DOWN"
  | "ABORTED"

export interface ProviderCapabilities {
  streaming: boolean
  tools: boolean
  multimodal: boolean
  jsonMode: boolean
  reasoning: boolean
  maxContextTokens: number
}

export interface ProviderHealth {
  status: "healthy" | "degraded" | "offline"
  latencyMs?: number
}

export interface StreamInput {
  messages: any[]
  signal?: AbortSignal
  patientId?: string
}

export interface LLMProvider {
  id: string
  name: string
  capabilities: ProviderCapabilities
  stream(input: StreamInput): AsyncGenerator<AIStreamEvent, void, unknown>
  health(): Promise<ProviderHealth>
}
