import { scrubObject } from "./scrubbers/phi"

type LogLevel = "info" | "warn" | "error" | "fatal"

export interface TelemetryEvent {
  eventName: string
  level: LogLevel
  payload: Record<string, any>
  timestamp: number
  traceId?: string
}

export class SecurityLogger {
  static log(eventName: string, payload: Record<string, any>, level: LogLevel = "info", traceId?: string) {
    const safePayload = scrubObject(payload)
    
    const event: TelemetryEvent = {
      eventName,
      level,
      payload: safePayload,
      timestamp: Date.now(),
      traceId
    }

    // In a real app, this dispatches to Datadog, Sentry, or an internal secure endpoint.
    // For now, we output to console if in dev, but simulated as an HTTP call.
    if (process.env.NODE_ENV === "development") {
      console.log(`[Telemetry:${level.toUpperCase()}] ${eventName}`, event)
    }
    
    // Example: fetch("/api/telemetry", { method: "POST", body: JSON.stringify(event) })
  }

  static error(eventName: string, error: Error | unknown, context?: Record<string, any>) {
    this.log(eventName, { error, ...context }, "error")
  }
}
