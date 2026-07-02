'use client'
import React from 'react'
import { SessionSummary, ApprovalSummary } from './types'

interface Props {
  sessions: Record<string, SessionSummary>
  approvals: ApprovalSummary[]
}

export function SafetyPanel({ sessions, approvals }: Props) {
  const list = Object.values(sessions)
  const total = list.length
  const hardStops = list.filter(s => s.escalationLevel === 'HARD_STOP').length
  const warnings = list.filter(s => s.escalationLevel === 'WARNING').length
  const reviewRequired = list.filter(s => s.requiresPhysicianReview).length
  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length

  // Calculate Escalation/Review Rate
  const escalatedSessions = list.filter(
    s => s.escalationLevel === 'HARD_STOP' || s.escalationLevel === 'WARNING' || s.requiresPhysicianReview
  ).length
  const escalationRate = total > 0 ? Math.round((escalatedSessions / total) * 100) : 0

  if (total === 0) {
    return (
      <div className="bg-[#0D121F]/30 border border-[#161B26] border-dashed rounded-xl p-6 text-center text-xs text-neutral-500">
        Nenhuma sessão registrada. Execute inferências no AI Sandbox para exibir estatísticas de conformidade.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Total Sessões */}
      <div className="bg-[#0D121F]/40 border border-[#161B26] hover:border-cyan-800/40 rounded-xl p-4 transition-colors flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total Sessões</span>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-3xl font-extrabold text-cyan-400 font-mono">{total}</span>
          <span className="text-[10px] text-neutral-500 font-mono">Taxa Esc.: {escalationRate}%</span>
        </div>
      </div>

      {/* HARD_STOP */}
      <div className="bg-[#0D121F]/40 border border-[#161B26] hover:border-red-950/40 rounded-xl p-4 transition-colors flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">HARD STOPs</span>
        <span className="text-3xl font-extrabold text-red-500 mt-1 font-mono">{hardStops}</span>
      </div>

      {/* Warnings */}
      <div className="bg-[#0D121F]/40 border border-[#161B26] hover:border-amber-950/40 rounded-xl p-4 transition-colors flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Warnings</span>
        <span className="text-3xl font-extrabold text-amber-500 mt-1 font-mono">{warnings}</span>
      </div>

      {/* Revisão Médica */}
      <div className="bg-[#0D121F]/40 border border-[#161B26] hover:border-orange-900/40 rounded-xl p-4 transition-colors flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Revisão Médica</span>
        <span className="text-3xl font-extrabold text-orange-400 mt-1 font-mono">{reviewRequired}</span>
      </div>

      {/* Aprovação Pendente */}
      <div className="bg-[#0D121F]/40 border border-[#161B26] hover:border-purple-900/40 rounded-xl p-4 transition-colors flex flex-col justify-between col-span-2 sm:col-span-1">
        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Aprovação Pendente</span>
        <span className="text-3xl font-extrabold text-purple-400 mt-1 font-mono">{pendingApprovalsCount}</span>
      </div>
    </div>
  )
}
