import { LLMProvider } from "./types"
import { MockProvider } from "./mock.provider"
import { GroqProvider } from "./groq.provider"

const providers: Record<string, LLMProvider> = {
  mock: new MockProvider(),
  groq: new GroqProvider()
}

export function getLLMProvider(): LLMProvider {
  const providerType = process.env.NEXT_PUBLIC_LLM_PROVIDER || "mock"
  return providers[providerType] || providers.mock
}
