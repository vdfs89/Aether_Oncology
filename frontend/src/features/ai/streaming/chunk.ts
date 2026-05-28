/**
 * src/features/ai/streaming/chunk.ts
 * 
 * Simulates realistic token chunks from an LLM.
 * Instead of streaming character by character, it chunks text into
 * words or small phrases to look natural.
 */

export function chunkTextRealistically(text: string): string[] {
  // Simple regex to split by words but keep whitespace and punctuation attached
  const regex = /([\w'-]+[.,?!:;]*\s*|[^\w\s]+\s*|\s+)/g
  const parts = text.match(regex) || [text]

  const chunks: string[] = []
  let currentChunk = ""

  for (const part of parts) {
    currentChunk += part
    // Group 1-3 words together to simulate tokenization output more closely
    // rather than perfect word-by-word
    if (Math.random() > 0.6 || currentChunk.length > 15) {
      chunks.push(currentChunk)
      currentChunk = ""
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}
