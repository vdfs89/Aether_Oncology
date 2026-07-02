export interface SessionEvent {
  id: string
  type: string
  timestamp: number
  traceId: string
  sessionId: string
  payload: Record<string, unknown>
}

export interface SessionSummary {
  traceId: string
  sessionId: string
  patientId: string
  startedAt: number
  completedAt?: number
  totalTokens?: number
  totalCostEstimate?: number
  totalLatencyMs?: number
  provider?: string
  model?: string
  escalationLevel?: string
  requiresPhysicianReview: boolean
  approvalRequestId?: string
  events: SessionEvent[]
}

export interface ApprovalSummary {
  approvalRequestId: string
  riskLevel: string
  rationale: string
  expiresAt: number
  status: 'PENDING' | 'RESOLVED' | 'EXPIRED' | 'ESCALATED'
  sessionId: string
}

export interface TelemetryState {
  sessions: Record<string, SessionSummary>
  approvals: ApprovalSummary[]
  activeTraceId: string | null
}
