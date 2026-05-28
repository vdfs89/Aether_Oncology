/**
 * src/features/ai/history/title-generation/generateSessionTitle.ts
 * 
 * Local heuristic for generating a quick, low-latency title for clinical sessions.
 * In a real platform, this acts as a placeholder before a background LLM task overrides it.
 */

export function generateSessionTitle(firstPrompt: string): string {
  // Very simple heuristics for MedTech contexts
  const lowerPrompt = firstPrompt.toLowerCase()
  
  // Extract possible keywords
  const keywords: string[] = []
  
  if (lowerPrompt.includes("mutação") || lowerPrompt.includes("mutation")) keywords.push("Mutation Analysis")
  if (lowerPrompt.includes("brca1") || lowerPrompt.includes("brca")) keywords.push("BRCA Review")
  if (lowerPrompt.includes("her2")) keywords.push("HER2 Profile")
  if (lowerPrompt.includes("progressão") || lowerPrompt.includes("progression")) keywords.push("Progression")
  if (lowerPrompt.includes("terapia") || lowerPrompt.includes("therapy")) keywords.push("Therapy Options")
  if (lowerPrompt.includes("efeito") || lowerPrompt.includes("adverso")) keywords.push("Adverse Effects")

  if (keywords.length > 0) {
    return keywords.join(" · ")
  }

  // Fallback: truncate the prompt intelligently
  const words = firstPrompt.trim().split(/\s+/)
  if (words.length <= 4) {
    return firstPrompt
  }

  return words.slice(0, 4).join(" ") + "..."
}
