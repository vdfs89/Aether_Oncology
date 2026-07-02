'use client'
import React, { useEffect } from 'react'
import { useTelemetry } from './useTelemetry'
import { SessionTimeline } from './SessionTimeline'
import { ApprovalsPanel } from './ApprovalsPanel'
import { SafetyPanel } from './SafetyPanel'
import { SessionEvent } from './types'
import { nanoid } from 'nanoid'
import { clinicalEventBus } from '../orchestration/runtime/eventBus'
import { Terminal, Shield, List } from 'lucide-react'

export function OpsClient() {
  const { state, recordEvent, setActiveTrace, exportSessionAsJSON, resolveApproval } =
    useTelemetry()

  // 1. Subscribe to the live Clinical Event Bus
  useEffect(() => {
    const unsubscribes: Array<() => void> = []

    const eventTypes = [
      "routing_decision",
      "status",
      "inference_envelope",
      "judgement_started",
      "judgement_completed",
      "hallucination_detected",
      "escalation_triggered",
      "token",
      "citation",
      "attachment",
      "trace",
      "error",
      "complete",
      "StateTransition",
      "RetrievalStarted",
      "ToolExecuted",
      "CitationAttached",
      "StreamCompleted",
      "InferenceFailed",
      "ClinicalApprovalRequested",
      "ClinicalApprovalResolved",
      "ExecutionPlanOverridden",
      "RiskProfileChanged",
      "OverrideRequested",
      "OverrideRejected"
    ]

    eventTypes.forEach(type => {
      const unsub = clinicalEventBus.subscribe(type as any, (payload, metadata) => {
        const sessionEvent: SessionEvent = {
          id: (payload as any)?.id || (payload as any)?.approvalRequestId || nanoid(),
          type,
          timestamp: metadata.timestamp || Date.now(),
          traceId: metadata.traceId || "gateway",
          sessionId: metadata.sessionId || "gateway",
          payload: payload as Record<string, unknown>
        }
        recordEvent(sessionEvent)
      })
      unsubscribes.push(unsub)
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [recordEvent])

  // 2. Mock events in development mode so the dashboard isn't empty initially
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    // Verify if there are already sessions to avoid duplicate mock loads
    if (Object.keys(state.sessions).length > 0) return

    const TRACE = 'trace-demo-001'
    const SESSION = 'session-demo-001'
    const base = { traceId: TRACE, sessionId: SESSION }

    const events: Array<[number, SessionEvent]> = [
      [300,  { 
        id: nanoid(), 
        type: 'routing_decision', 
        timestamp: Date.now() + 300,
        ...base, 
        payload: { 
          provider: 'openai', 
          model: 'gpt-4o',
          rationale: 'Low latency task', 
          estimated_cost: 0.002,
          estimated_latency_ms: 450 
        }
      }],
      [1200, { 
        id: nanoid(), 
        type: 'inference_envelope', 
        timestamp: Date.now() + 1200,
        ...base, 
        payload: { 
          prompt_tokens: 312, 
          completion_tokens: 128,
          latency_ms: 823, 
          cost_estimate: 0.0034 
        }
      }],
      [1800, { 
        id: nanoid(), 
        type: 'judgement_completed', 
        timestamp: Date.now() + 1800,
        ...base, 
        payload: { 
          judgement: { 
            approved: true, 
            confidence: 0.72,
            hallucination_risk: 'MEDIUM', 
            evidence_strength: 'MODERATE',
            escalation_level: 'WARNING', 
            requires_physician_review: true,
            missing_citations: ['Fonte clínica ausente'], 
            contradictions: [] 
          }
        }
      }],
      [2500, {
        id: nanoid(),
        type: 'approval_required',
        timestamp: Date.now() + 2500,
        ...base,
        payload: {
          approval_request_id: 'app-req-99',
          risk_level: 'HIGH',
          rationale: 'Mapeamento de biomarcador BRCA1 detectado sem autorização prévia',
          expires_at: Date.now() + 300000 // 5 minutes in future
        }
      }],
      [5000, {
        id: nanoid(),
        type: 'complete',
        timestamp: Date.now() + 5000,
        ...base,
        payload: {
          total_tokens: 440
        }
      }]
    ]

    const timers = events.map(([delay, event]) => {
      return setTimeout(() => {
        recordEvent(event)
      }, delay)
    })

    return () => {
      timers.forEach(t => clearTimeout(t))
    }
  }, [recordEvent, state.sessions])

  const sessionList = Object.values(state.sessions)
  const activeSession = state.activeTraceId ? state.sessions[state.activeTraceId] : null

  const handleExport = (traceId: string) => {
    const jsonStr = exportSessionAsJSON(traceId)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `session-trace-${traceId.slice(0, 8)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 text-neutral-200">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <Terminal className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">Clinical Ops Control</h2>
          <p className="text-xs text-neutral-400">Auditoria síncrona de streaming de IA, segurança e supervisão médica.</p>
        </div>
      </div>

      {/* Safety metrics panel */}
      <SafetyPanel sessions={state.sessions} approvals={state.approvals} />

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sessions List + Active Session Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Sessions List */}
          <div className="bg-[#0D121F]/40 border border-[#161B26] rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <List className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Sessões Ativas</h3>
            </div>
            {sessionList.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">Nenhuma sessão registrada. Execute inferências no AI Sandbox para popular.</p>
            ) : (
              <div className="flex gap-2 flex-wrap max-h-36 overflow-y-auto custom-scrollbar">
                {sessionList.map(s => {
                  const isActive = s.traceId === state.activeTraceId
                  return (
                    <button
                      key={s.traceId}
                      onClick={() => setActiveTrace(s.traceId)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold'
                          : 'bg-[#0A0D14]/80 border-[#161B26] hover:border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.completedAt ? 'bg-emerald-500' : 'bg-cyan-400 animate-pulse'}`} />
                      {s.traceId.slice(0, 8)}...
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detailed timeline for the active session */}
          {activeSession ? (
            <SessionTimeline 
              session={activeSession}
              onExport={() => handleExport(activeSession.traceId)}
            />
          ) : (
            <div className="bg-[#0D121F]/40 border border-[#161B26] rounded-xl py-24 text-center text-xs text-neutral-500">
              Selecione uma sessão acima para inspecionar os detalhes do trace.
            </div>
          )}
        </div>

        {/* Right Column: Real-time Approvals Panel */}
        <div className="lg:col-span-4">
          <ApprovalsPanel 
            approvals={state.approvals}
            onResolve={resolveApproval}
          />
        </div>
      </div>
    </div>
  )
}
