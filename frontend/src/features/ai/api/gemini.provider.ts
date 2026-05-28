import { OpenAICompatibleProvider } from "./openai-compatible.provider"

export class GeminiProvider extends OpenAICompatibleProvider {
  id = "gemini"
  name = "Gemini 1.5 Clinical Engine"

  constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    super(`${baseUrl}/api/v1/clinical/chat`)
    this.capabilities = {
      streaming: true,
      tools: true,
      multimodal: true,
      jsonMode: true,
      reasoning: true,
      maxContextTokens: 2000000
    }
  }
}
