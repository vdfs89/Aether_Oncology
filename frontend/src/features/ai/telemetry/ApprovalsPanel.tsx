'use client'
import React, { useEffect, useState } from 'react'
import { ApprovalSummary } from './types'

interface Props {
  approvals: ApprovalSummary[]
  onResolve: (approvalRequestId: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED') => void
}

function ApprovalCard({ 
  approval, 
  onResolve 
}: { 
  approval: ApprovalSummary
  onResolve: (id: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED') => void 
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    if (approval.status !== 'PENDING') return

    const updateTimer = () => {
      const remaining = Math.max(0, approval.expiresAt - Date.now())
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [approval])

  const isExpired = approval.status === 'PENDING' && timeLeft <= 0
  const displayStatus = isExpired ? 'EXPIRED' : approval.status

  const formattedTimeLeft = (() => {
    if (timeLeft <= 0) return '00:00'
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })()

  const isUrgent = timeLeft > 0 && timeLeft < 60000 // Under 1 minute is urgent

  // Risk badge color mapping
  const riskColors = 
    approval.riskLevel === 'CRITICAL' ? 'bg-red-950/40 border-red-800/40 text-red-400 font-bold' :
    approval.riskLevel === 'HIGH' ? 'bg-orange-950/40 border-orange-800/40 text-orange-400 font-bold' :
    approval.riskLevel === 'MODERATE' ? 'bg-amber-950/40 border-amber-800/40 text-amber-400 font-bold' :
    'bg-blue-950/40 border-blue-800/40 text-blue-400 font-bold'

  return (
    <div className="bg-[#0A0D14]/60 border border-[#161B26] rounded-lg p-4 flex flex-col gap-3 hover:border-neutral-850 transition-colors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${riskColors}`}>
            {approval.riskLevel}
          </span>
          <span className="font-mono text-xs text-neutral-500">
            ID: {approval.approvalRequestId.slice(0, 8)}...
          </span>
        </div>

        {displayStatus === 'PENDING' && (
          <div className={`text-xs font-mono px-2 py-0.5 rounded border animate-pulse ${
            isUrgent 
              ? 'text-red-400 bg-red-950/20 border-red-800/30' 
              : 'text-amber-400 bg-amber-950/20 border-amber-800/30'
          }`}>
            ⏳ {isUrgent ? 'URGENTE: ' : ''}Expirando em {formattedTimeLeft}
          </div>
        )}

        {displayStatus === 'RESOLVED' && (
          <div className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-800/40 text-emerald-400">
            ✓ RESOLVIDA
          </div>
        )}

        {displayStatus === 'ESCALATED' && (
          <div className="text-[10px] font-bold px-2 py-0.5 rounded border bg-red-950/40 border-red-800/40 text-red-400">
            🚨 ESCALADA
          </div>
        )}

        {(displayStatus === 'EXPIRED' || approval.status === 'EXPIRED') && (
          <div className="text-[10px] font-bold px-2 py-0.5 rounded border bg-neutral-900 border-neutral-800 text-neutral-500">
            ⏱ EXPIRADA
          </div>
        )}
      </div>

      <div className="text-xs text-neutral-300">
        <p className="line-clamp-3">{approval.rationale}</p>
        <div className="mt-1 text-[10px] font-mono text-neutral-500">
          Sessão: {approval.sessionId.slice(0, 8)}...
        </div>
      </div>

      {displayStatus === 'PENDING' && (
        <div className="flex gap-2 justify-end mt-1 flex-wrap">
          <button
            onClick={() => onResolve(approval.approvalRequestId, 'ESCALATED')}
            className="px-2.5 py-1.5 rounded border border-red-900 bg-red-950/30 text-red-400 hover:bg-red-950/50 text-xs transition-colors font-medium"
          >
            Escalar
          </button>
          <button
            onClick={() => onResolve(approval.approvalRequestId, 'REJECTED')}
            className="px-2.5 py-1.5 rounded border border-neutral-850 bg-neutral-800 hover:bg-neutral-750 text-xs text-neutral-300 transition-colors font-medium"
          >
            Rejeitar
          </button>
          <button
            onClick={() => onResolve(approval.approvalRequestId, 'APPROVED')}
            className="px-3 py-1.5 rounded border border-emerald-950 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60 text-xs transition-colors font-bold"
          >
            Aprovar
          </button>
        </div>
      )}
    </div>
  )
}

export function ApprovalsPanel({ approvals, onResolve }: Props) {
  const pendingCount = approvals.filter(a => a.status === 'PENDING').length

  return (
    <div className="flex flex-col bg-[#0D121F]/40 border border-[#161B26] rounded-xl overflow-hidden shadow-lg h-full max-h-[700px]">
      {/* Header */}
      <div className="p-4 bg-[#07090E] border-b border-[#161B26] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Physician Approvals</h3>
          <p className="text-[10px] text-neutral-500 font-medium">Controle de Segurança e Auditabilidade Clínica</p>
        </div>
        <span className="text-[10px] bg-[#0A0D14] border border-[#161B26] text-neutral-400 px-2 py-0.5 rounded font-mono font-bold">
          {pendingCount} Pendentes
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
            <span className="text-2xl" role="img" aria-label="Shield">🛡️</span>
            <div className="text-xs text-neutral-500 font-semibold">Nenhuma solicitação de aprovação registrada</div>
            <p className="text-[10px] text-neutral-600 max-w-[200px]">Sessões que geram alertas ou riscos críticos aparecerão aqui para revisão.</p>
          </div>
        ) : (
          approvals.map(approval => (
            <ApprovalCard 
              key={approval.approvalRequestId}
              approval={approval}
              onResolve={onResolve}
            />
          ))
        )}
      </div>
    </div>
  )
}
