'use client'
import React, { useState } from 'react'
import { SessionSummary, SessionEvent } from './types'

interface Props {
  session: SessionSummary
  onExport: () => void
}

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  routing_decision:     { label: 'Roteamento',            color: '#3b82f6', icon: '🔀' },
  status:               { label: 'Status',                 color: '#6b7280', icon: '⏳' },
  inference_envelope:   { label: 'Inferência',             color: '#8b5cf6', icon: '🧠' },
  judgement_started:    { label: 'Julgamento iniciado',    color: '#f59e0b', icon: '⚖️' },
  judgement_completed:  { label: 'Julgamento',             color: '#10b981', icon: '✅' },
  hallucination_detected: { label: 'Alucinação detectada', color: '#ef4444', icon: '⚠️' },
  escalation_triggered: { label: 'Escalação acionada',     color: '#ef4444', icon: '🚨' },
  approval_required:    { label: 'Aprovação pendente',     color: '#f97316', icon: '🩺' },
  ClinicalApprovalRequested: { label: 'Aprovação pendente', color: '#f97316', icon: '🩺' },
  ClinicalApprovalResolved: { label: 'Aprovação resolvida', color: '#10b981', icon: '✓' },
  complete:             { label: 'Completo',               color: '#10b981', icon: '🏁' },
  StreamCompleted:      { label: 'Stream Concluído',       color: '#10b981', icon: '🏁' },
  error:                { label: 'Erro',                   color: '#ef4444', icon: '❌' },
  InferenceFailed:      { label: 'Falha de Inferência',    color: '#ef4444', icon: '❌' },
  StateTransition:      { label: 'Transição de Estado',    color: '#06b6d4', icon: '🔄' },
  RetrievalStarted:     { label: 'RAG Iniciado',           color: '#eab308', icon: '🔍' },
  ToolExecuted:         { label: 'Ferramenta Executada',   color: '#a855f7', icon: '🔧' },
  CitationAttached:     { label: 'Citação Anexada',        color: '#3b82f6', icon: '🔗' },
  token:                { label: 'Token de Stream',        color: '#94a3b8', icon: '✍️' },
}

export function SessionTimeline({ session, onExport }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'INFERENCE' | 'APPROVAL'>('ALL')
  const [showTokens, setShowTokens] = useState<boolean>(false)

  const duration = session.completedAt 
    ? session.completedAt - session.startedAt 
    : Date.now() - session.startedAt

  const displayDuration = duration > 0 ? `${(duration / 1000).toFixed(2)}s` : '0.00s'

  // Filter events based on selections
  const filteredEvents = session.events.filter(e => {
    // 1. Token visibility
    if (e.type === 'token' && !showTokens) return false

    // 2. Tab filters
    if (filterType === 'CRITICAL') {
      const isCriticalEvent = 
        e.type === 'error' || 
        e.type === 'InferenceFailed' ||
        e.type === 'escalation_triggered' || 
        e.type === 'hallucination_detected'
      
      const hasCriticalJudgement = 
        e.type === 'judgement_completed' && 
        (e.payload?.judgement as any)?.escalation_level && 
        (e.payload?.judgement as any)?.escalation_level !== 'NONE'

      return isCriticalEvent || hasCriticalJudgement
    }

    if (filterType === 'INFERENCE') {
      return e.type === 'routing_decision' || e.type === 'inference_envelope' || e.type === 'RetrievalStarted' || e.type === 'ToolExecuted'
    }

    if (filterType === 'APPROVAL') {
      return e.type === 'approval_required' || e.type === 'ClinicalApprovalRequested' || e.type === 'ClinicalApprovalResolved' || e.type === 'judgement_completed'
    }

    return true
  })

  // Helper to check if an event is highly critical (for visual border highlighting)
  const getHighlightClass = (event: SessionEvent) => {
    const type = event.type
    const j = event.payload?.judgement as any || {}
    const isHardStop = j.escalation_level === 'HARD_STOP' || event.payload?.risk_level === 'CRITICAL'
    const isWarning = j.escalation_level === 'WARNING' || event.payload?.risk_level === 'HIGH' || type === 'hallucination_detected'

    if (type === 'error' || type === 'InferenceFailed' || type === 'escalation_triggered' || isHardStop) {
      return 'border-l-4 border-l-red-500 bg-red-950/15 border-[#ef4444]/30'
    }
    if (isWarning) {
      return 'border-l-4 border-l-amber-500 bg-amber-950/15 border-[#f59e0b]/30'
    }
    return 'border-l-4 border-l-neutral-700 bg-[#0A0D14]/60 border-[#161B26]'
  }

  return (
    <div className="flex flex-col bg-[#0D121F]/40 border border-[#161B26] rounded-xl overflow-hidden shadow-lg h-full max-h-[700px]">
      {/* Header */}
      <div className="p-4 bg-[#07090E] border-b border-[#161B26] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Trace Timeline</h4>
          <div className="font-mono text-[11px] text-cyan-400 font-bold mt-1">Trace: {session.traceId.slice(0, 8)}...</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="text-right">
            <span className="text-neutral-500 block text-[10px] uppercase font-bold">Model</span>
            <span className="text-neutral-300 font-mono">{session.provider ? `${session.provider}/${session.model}` : 'Initializing...'}</span>
          </div>
          <div className="text-right px-3 border-l border-[#161B26]">
            <span className="text-neutral-500 block text-[10px] uppercase font-bold">Latency</span>
            <span className="text-purple-400 font-mono font-semibold">{displayDuration}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 py-2.5 bg-[#0A0D14]/80 border-b border-[#161B26] flex flex-wrap gap-2 justify-between items-center text-xs">
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded transition-colors ${filterType === 'ALL' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('CRITICAL')}
            className={`px-2.5 py-1 rounded transition-colors ${filterType === 'CRITICAL' ? 'bg-red-950/60 border border-red-800/40 text-red-400 font-semibold' : 'text-neutral-400 hover:text-red-400'}`}
          >
            Critical & Alertas
          </button>
          <button
            onClick={() => setFilterType('INFERENCE')}
            className={`px-2.5 py-1 rounded transition-colors ${filterType === 'INFERENCE' ? 'bg-blue-950/60 border border-blue-800/40 text-blue-400 font-semibold' : 'text-neutral-400 hover:text-blue-400'}`}
          >
            Inferência & RAG
          </button>
          <button
            onClick={() => setFilterType('APPROVAL')}
            className={`px-2.5 py-1 rounded transition-colors ${filterType === 'APPROVAL' ? 'bg-purple-950/60 border border-purple-800/40 text-purple-400 font-semibold' : 'text-neutral-400 hover:text-purple-400'}`}
          >
            Aprovações
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-neutral-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showTokens}
            onChange={(e) => setShowTokens(e.target.checked)}
            className="rounded border-[#161B26] bg-[#0A0D14] text-cyan-500 focus:ring-0 focus:ring-offset-0 w-3 h-3"
          />
          <span>Exibir raw tokens</span>
        </label>
      </div>

      {/* Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-xs border border-dashed border-[#161B26] rounded-lg">
            Nenhum evento corresponde ao filtro selecionado.
          </div>
        ) : (
          <div className="relative border-l border-[#161B26] pl-6 ml-3 space-y-4">
            {filteredEvents.map((event, index) => {
              const config = EVENT_CONFIG[event.type] || { label: event.type, color: '#94a3b8', icon: '🔹' }
              const relTime = ((event.timestamp - session.startedAt) / 1000).toFixed(2)
              const cardClass = getHighlightClass(event)
              const payload = event.payload as any

              return (
                <div key={event.id || index} className="relative group">
                  {/* Icon Marker */}
                  <div 
                    className="absolute -left-[35px] top-1.5 bg-[#07090E] border rounded-full w-6 h-6 flex items-center justify-center text-xs group-hover:scale-110 transition-transform"
                    style={{ borderColor: config.color }}
                  >
                    {config.icon}
                  </div>

                  {/* Card Container */}
                  <div className={`border rounded-lg p-3 transition-all duration-200 ${cardClass}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold" style={{ color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        +{relTime}s
                      </span>
                    </div>

                    {/* Detailed Layouts per Event Type */}
                    <div className="text-xs text-neutral-400 space-y-1">
                      {event.type === 'routing_decision' && (
                        <div>
                          Roteamento inteligente para <strong className="text-cyan-400 font-mono">{payload.model as string}</strong> ({payload.provider as string}). 
                          <div className="mt-1 text-[11px] text-neutral-500">Raciocínio: <em>"{payload.rationale as string}"</em></div>
                        </div>
                      )}

                      {event.type === 'inference_envelope' && (
                        <div className="flex flex-wrap gap-4 text-[11px] font-mono">
                          <span>Tokens: <strong className="text-neutral-300">{(payload.prompt_tokens as number) + (payload.completion_tokens as number)}</strong></span>
                          <span>Latência: <strong className="text-neutral-300">{payload.latency_ms as number}ms</strong></span>
                          <span>Custo Est.: <strong className="text-emerald-500">${(payload.cost_estimate as number ?? 0).toFixed(4)}</strong></span>
                        </div>
                      )}

                      {event.type === 'judgement_completed' && (
                        <div className="space-y-1">
                          <div>Avaliação da política clínica concluída:</div>
                          {(() => {
                            const j = payload.judgement as Record<string, any> || {}
                            const escColor = 
                              j.escalation_level === 'HARD_STOP' ? 'bg-red-950/40 border-red-800/40 text-red-400 font-bold' :
                              j.escalation_level === 'WARNING' ? 'bg-amber-950/40 border-amber-800/40 text-amber-400 font-bold' :
                              'bg-emerald-950/40 border-emerald-800/40 text-emerald-400 font-bold'
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${escColor}`}>
                                  {j.escalation_level || 'NONE'}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/40 text-neutral-300 font-mono">
                                  Conf: {Math.round((j.confidence ?? 0) * 100)}%
                                </span>
                                {j.hallucination_risk && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/40 text-neutral-300">
                                    Alucinação: {j.hallucination_risk}
                                  </span>
                                )}
                                {j.requires_physician_review && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-800/40 bg-orange-950/30 text-orange-400 font-semibold">
                                    Requer CRM/NPI
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {event.type === 'hallucination_detected' && (
                        <div className="text-red-400 font-medium">
                          Alucinação clínica identificada! Risco de consistência médica: <strong className="text-white font-mono">{String(payload.risk || 'HIGH')}</strong>
                        </div>
                      )}

                      {event.type === 'escalation_triggered' && (
                        <div className="space-y-1">
                          <div className="text-red-400 font-bold flex items-center gap-1.5">
                            🚨 Escalação Ativada: {payload.level as string}
                          </div>
                          <div className="text-neutral-300">Motivo: {payload.reason as string}</div>
                        </div>
                      )}

                      {(event.type === 'approval_required' || event.type === 'ClinicalApprovalRequested') && (
                        <div className="space-y-1.5 border border-orange-950/40 bg-orange-950/10 rounded p-2 mt-1">
                          <div className="font-bold text-orange-400">Revisão Médica Obrigatória</div>
                          <div className="text-[11px] text-neutral-300">
                            Raciocínio: {Array.isArray(payload.rationale) 
                              ? payload.rationale.join(' ') 
                              : (payload.rationale || 'Nível de risco elevado exige consentimento manual do médico.')}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Request ID: {(payload.approval_request_id || payload.approvalRequestId || '').slice(0, 8)}...
                          </div>
                        </div>
                      )}

                      {event.type === 'ClinicalApprovalResolved' && (
                        <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                          ✓ Pedido de aprovação resolvida: <strong className="text-white font-mono">{payload.decision as string}</strong>
                        </div>
                      )}

                      {(event.type === 'complete' || event.type === 'StreamCompleted') && (
                        <div className="text-neutral-300">
                          Iniciativa finalizada com sucesso. Total tokens consumidos: <strong className="font-mono">{payload.totalTokens || payload.total_tokens || 'N/A'}</strong>.
                        </div>
                      )}

                      {(event.type === 'error' || event.type === 'InferenceFailed') && (
                        <div className="text-red-400 border border-red-950/40 bg-red-950/10 rounded p-2 mt-1 font-mono">
                          {((payload.error as any)?.message as string) || String(payload.error || payload)}
                        </div>
                      )}

                      {event.type === 'StateTransition' && (
                        <div className="text-neutral-500 font-mono text-[11px]">
                          Fase do Runtime: <span className="text-neutral-400">{payload.from as string}</span> ➔ <span className="text-cyan-400">{payload.to as string}</span>
                        </div>
                      )}

                      {event.type === 'RetrievalStarted' && (
                        <div>
                          Pesquisa RAG em diretrizes oncológicas: <code className="text-amber-400 bg-amber-950/20 px-1 rounded font-mono">"{payload.query as string}"</code>
                        </div>
                      )}

                      {event.type === 'ToolExecuted' && (
                        <div className="text-[11px]">
                          Ferramenta clínica <code className="text-purple-400 font-mono font-bold">{payload.toolId as string}</code> executada.
                        </div>
                      )}

                      {event.type === 'CitationAttached' && (
                        <div className="text-neutral-300 text-[11px]">
                          🔗 Anexada fonte de auditoria: <strong className="text-blue-400 font-medium">{payload.source}</strong> (Relevância: {Math.round((payload.relevance ?? 0) * 100)}%)
                        </div>
                      )}

                      {event.type === 'token' && (
                        <div className="font-mono text-neutral-500 text-[10px] break-all">
                          Stream token: <span className="text-neutral-400 bg-neutral-900/30 px-1 py-0.5 rounded font-mono">"{payload.text as string || payload.token as string}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-[#07090E] border-t border-[#161B26] flex items-center justify-between text-xs shrink-0">
        <div className="flex gap-4">
          <div>
            <span className="text-neutral-500">Tokens:</span>{' '}
            <strong className="text-neutral-300 font-mono">{session.totalTokens ?? 0}</strong>
          </div>
          <div>
            <span className="text-neutral-500">Custo:</span>{' '}
            <strong className="text-emerald-500 font-mono">${(session.totalCostEstimate ?? 0).toFixed(4)}</strong>
          </div>
        </div>
        <button
          onClick={onExport}
          className="px-3 py-1.5 rounded bg-neutral-850 hover:bg-neutral-800 border border-[#161B26] hover:border-neutral-700 text-white font-medium transition-colors text-xs"
        >
          Exportar JSON
        </button>
      </div>
    </div>
  )
}
