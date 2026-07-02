'use client'
import { useState, useCallback } from 'react'
import { TelemetryState, SessionEvent, SessionSummary, ApprovalSummary } from './types'
import { clinicalApprovalManager } from '../orchestration/runtime/approvalManager'

function scrubPII(text: string): string {
  let scrubbed = text
  // CPF: XXX.XXX.XXX-XX or XXXXXXXXXXX
  scrubbed = scrubbed.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF SCRUBBED]')
  // Phone: (XX) XXXX-XXXX or (XX) XXXXX-XXXX
  scrubbed = scrubbed.replace(/\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, '[PHONE SCRUBBED]')
  // Email
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL SCRUBBED]')
  return scrubbed
}

function scrubObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return scrubPII(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map(item => scrubObject(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const scrubbedObj: Record<string, any> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (/name|patientName|nome|cpf|email|phone|telefone|rg|address|endereco/i.test(key)) {
          scrubbedObj[key] = '[PII SCRUBBED]'
        } else {
          scrubbedObj[key] = scrubObject(obj[key])
        }
      }
    }
    return scrubbedObj as T
  }
  return obj
}

export function useTelemetry() {
  const [state, setState] = useState<TelemetryState>({
    sessions: {},
    approvals: [],
    activeTraceId: null,
  })

  const recordEvent = useCallback((rawEvent: SessionEvent) => {
    // Scrub PII before saving to state (LGPD-compliant)
    const event = scrubObject(rawEvent)

    setState(prev => {
      const existing = prev.sessions[event.traceId]
      const session: SessionSummary = existing ?? {
        traceId: event.traceId,
        sessionId: event.sessionId,
        patientId: (event.payload.patientId as string) ?? 'unknown',
        startedAt: event.timestamp,
        requiresPhysicianReview: false,
        events: [],
      }

      // Keep all events including tokens in the raw event history
      const updated: SessionSummary = { ...session, events: [...session.events, event] }

      // Map SSE and bus events to summary metrics
      if (event.type === 'routing_decision') {
        updated.provider = event.payload.provider as string
        updated.model = event.payload.model as string
      }
      if (event.type === 'inference_envelope') {
        updated.totalTokens = ((updated.totalTokens ?? 0) +
          ((event.payload.prompt_tokens as number ?? 0) +
           (event.payload.completion_tokens as number ?? 0)))
        updated.totalCostEstimate = (updated.totalCostEstimate ?? 0) +
          (event.payload.cost_estimate as number ?? 0)
        updated.totalLatencyMs = (updated.totalLatencyMs ?? 0) +
          (event.payload.latency_ms as number ?? 0)
      }
      if (event.type === 'judgement_completed') {
        const j = event.payload.judgement as Record<string, unknown>
        updated.escalationLevel = j?.escalation_level as string
        updated.requiresPhysicianReview = j?.requires_physician_review as boolean ?? false
      }
      if (event.type === 'approval_required' || event.type === 'ClinicalApprovalRequested') {
        updated.approvalRequestId = (event.payload.approval_request_id || event.payload.approvalRequestId) as string
        updated.requiresPhysicianReview = true
      }
      if (event.type === 'complete' || event.type === 'StreamCompleted') {
        updated.completedAt = Date.now()
        if (event.payload.totalTokens || event.payload.total_tokens) {
          updated.totalTokens = (event.payload.totalTokens || event.payload.total_tokens) as number
        }
      }
      if (event.type === 'escalation_triggered') {
        updated.escalationLevel = event.payload.level as string
      }

      // Update approvals
      let approvals = prev.approvals
      if (event.type === 'approval_required' || event.type === 'ClinicalApprovalRequested') {
        const reqId = (event.payload.approval_request_id || event.payload.approvalRequestId) as string
        const approval: ApprovalSummary = {
          approvalRequestId: reqId,
          riskLevel: (event.payload.risk_level || event.payload.riskLevel || 'HIGH') as string,
          rationale: (Array.isArray(event.payload.rationale) 
            ? event.payload.rationale.join(' ') 
            : (event.payload.rationale || 'Revisão médica necessária')) as string,
          expiresAt: (event.payload.expires_at || event.payload.expiresAt || (Date.now() + 15 * 60 * 1000)) as number,
          status: 'PENDING',
          sessionId: event.sessionId,
        }
        approvals = [...approvals.filter(a => a.approvalRequestId !== reqId), approval]
      }

      if (event.type === 'ClinicalApprovalResolved') {
        const reqId = (event.payload.approval_request_id || event.payload.approvalRequestId) as string
        const decision = event.payload.decision as string
        approvals = approvals.map(a => {
          if (a.approvalRequestId === reqId) {
            return { 
              ...a, 
              status: decision === 'ESCALATED' ? ('ESCALATED' as const) : ('RESOLVED' as const) 
            }
          }
          return a
        })
      }

      return {
        ...prev,
        sessions: { ...prev.sessions, [event.traceId]: updated },
        approvals,
        activeTraceId: prev.activeTraceId ?? event.traceId,
      }
    })
  }, [])

  const setActiveTrace = useCallback((traceId: string) => {
    setState(prev => ({ ...prev, activeTraceId: traceId }))
  }, [])

  const exportSessionAsJSON = useCallback((traceId: string): string => {
    const session = state.sessions[traceId]
    if (!session) return '{}'
    return JSON.stringify({ ...session, exportedAt: new Date().toISOString() }, null, 2)
  }, [state])

  const resolveApproval = useCallback((approvalRequestId: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED') => {
    setState(prev => ({
      ...prev,
      approvals: prev.approvals.map(a =>
        a.approvalRequestId === approvalRequestId
          ? { ...a, status: decision === 'ESCALATED' ? ('ESCALATED' as const) : ('RESOLVED' as const) }
          : a
      ),
    }))

    const telemetryApproval = state.approvals.find(a => a.approvalRequestId === approvalRequestId)
    const sessionId = telemetryApproval?.sessionId || ""

    const pending = clinicalApprovalManager.getPendingApprovals()
    const found = pending.find(p => p.approvalRequestId === approvalRequestId)
    if (found) {
      const context = {
        createEventMetadata: (state: string) => ({
          traceId: "ui-trace",
          sessionId: sessionId,
          patientId: "unknown",
          timestamp: Date.now(),
          runtimeState: state as any,
        })
      }
      try {
        clinicalApprovalManager.resolveApproval(approvalRequestId, decision as any, context as any)
      } catch (err) {
        console.error("[useTelemetry] Failed to resolve in clinicalApprovalManager:", err)
      }
    }
  }, [])

  return { state, recordEvent, setActiveTrace, exportSessionAsJSON, resolveApproval }
}
