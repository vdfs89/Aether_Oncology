import React from "react"
import { ClinicalRiskLevel } from "../../orchestration/planner/types"
import { AlertTriangle, ShieldCheck, ShieldAlert, AlertOctagon } from "lucide-react"

interface ApprovalRiskBadgeProps {
  level: ClinicalRiskLevel
}

export function ApprovalRiskBadge({ level }: ApprovalRiskBadgeProps) {
  const config = {
    LOW: {
      icon: ShieldCheck,
      text: "Low Risk",
      className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    },
    MODERATE: {
      icon: AlertTriangle,
      text: "Moderate Risk",
      className: "text-amber-400 bg-amber-400/10 border-amber-400/20"
    },
    HIGH: {
      icon: ShieldAlert,
      text: "High Risk",
      className: "text-orange-500 bg-orange-500/10 border-orange-500/20"
    },
    CRITICAL: {
      icon: AlertOctagon,
      text: "Critical Risk",
      className: "text-red-500 bg-red-500/10 border-red-500/20 animate-pulse"
    }
  } as Record<ClinicalRiskLevel, { icon: React.ElementType, text: string, className: string }>

  const { icon: Icon, text, className } = config[level]

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </div>
  )
}
