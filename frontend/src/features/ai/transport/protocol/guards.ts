import { AIStreamEvent, AIStreamEventSchema } from "./protocol"
import { z } from "zod"

/**
 * Validates an unknown payload against the AIStreamEvent protocol.
 * Returns the parsed event if valid, otherwise throws or returns an error.
 */
export function parseAIStreamEvent(payload: unknown): AIStreamEvent {
  return AIStreamEventSchema.parse(payload)
}

/**
 * Safe version of parseAIStreamEvent that doesn't throw.
 * Useful for stream readers that want to ignore malformed chunks.
 */
export function safeParseAIStreamEvent(payload: unknown): { success: true; data: AIStreamEvent } | { success: false; error: z.ZodError } {
  return AIStreamEventSchema.safeParse(payload)
}

/**
 * Type guards for individual events (optional, useful for switch blocks if needed).
 */
export function isTokenEvent(event: AIStreamEvent): event is Extract<AIStreamEvent, { type: "token" }> {
  return event.type === "token"
}

export function isStatusEvent(event: AIStreamEvent): event is Extract<AIStreamEvent, { type: "status" }> {
  return event.type === "status"
}

export function isErrorEvent(event: AIStreamEvent): event is Extract<AIStreamEvent, { type: "error" }> {
  return event.type === "error"
}
