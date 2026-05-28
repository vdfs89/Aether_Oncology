/**
 * src/features/ai/telemetry/index.ts
 * 
 * Observability hooks for the AI subsystem.
 * Provides functions to track inference, streaming latency, citation usage,
 * and attachment interactions. Even if mocked now, it establishes the 
 * integration points for Datadog/PostHog in Phase 3.
 */

export function trackInference(traceId: string, modelVersion: string, payloadSize: number) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Telemetry] Inference Started: ${traceId} | Model: ${modelVersion} | Payload: ${payloadSize} bytes`)
  }
}

export function trackStreamingLatency(traceId: string, ttfbMs: number, totalDurationMs: number) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Telemetry] Streaming Latency: ${traceId} | TTFB: ${ttfbMs}ms | Total: ${totalDurationMs}ms`)
  }
}

export function trackCitationUsage(citationId: string, messageId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Telemetry] Citation Clicked: ${citationId} | Msg: ${messageId}`)
  }
}

export function trackAttachmentExpand(attachmentType: string, action: "expand" | "collapse", messageId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Telemetry] Attachment ${action}: ${attachmentType} | Msg: ${messageId}`)
  }
}
