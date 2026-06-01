import { OpenAICompatibleProvider } from "./openai-compatible.provider"

export class GroqProvider extends OpenAICompatibleProvider {
  id = "groq"
  name = "Groq Llama-3 / DeepSeek Inference Engine"

  constructor() {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.vitorsilva.engineer"
    super(`${baseUrl}/api/v1/clinical/chat`)
    this.capabilities = {
      streaming: true,
      tools: true,
      multimodal: false,
      jsonMode: true,
      reasoning: true,
      maxContextTokens: 128000
    }
  }
}
