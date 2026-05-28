"use client"

import * as React from "react"
import { copilotTheme } from "../../theme"
import { ClinicalSafetyHUD } from "../safety/ClinicalSafetyHUD"

export function CopilotSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-80 border-l border-[#1A2235] bg-[#0A0D14] h-full p-6 overflow-y-auto space-y-8">
      
      {/* Safety HUD */}
      <ClinicalSafetyHUD />

      {/* Patient Context Block */}
      <div>
        <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">
          Clinical Context
        </h3>
        
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center text-cyan-400 font-mono text-xs border border-cyan-900/50 mt-1">
            PT
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-200">Paciente Anônimo</div>
            <div className="text-xs text-neutral-500 font-mono mt-0.5">ID: AET-8924</div>
            <div className="text-xs text-rose-400 font-medium mt-1">
              Active Alerts: 1
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Signals */}
      <div>
        <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">
          Risk Factors & Signals
        </h3>
        
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-[#121622] border border-[#1A2235] hover:border-cyan-900/50 transition-colors">
            <div className="text-xs font-medium text-cyan-400 mb-1">KRAS G12C Mutation</div>
            <div className="text-[11px] text-neutral-400 leading-relaxed">
              Detected in recent liquid biopsy. Highly actionable target for specific inhibitors.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Findings / Evidence */}
      <div>
        <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">
          Correlated Evidence
        </h3>
        
        <div className="text-sm text-neutral-600 text-center py-8 border border-dashed border-[#1A2235] rounded-lg">
          No live predictions active.
        </div>
      </div>

    </aside>
  )
}
