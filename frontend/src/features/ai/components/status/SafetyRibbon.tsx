"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react"

export function SafetyRibbon() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="w-full border-b border-neutral-900 bg-[#0A0D14]/80 backdrop-blur-md z-10 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2 flex-1">
          <ShieldAlert className="w-4 h-4 text-cyan-500/70 mt-0.5 sm:mt-0 flex-shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[11px] font-medium tracking-wide">
            <span className="text-cyan-500/90 uppercase tracking-widest">Clinical Advisory</span>
            {!isCollapsed && (
              <span className="text-neutral-400">
                AI-generated insights require clinical validation and professional review. Not a medical diagnosis.
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-neutral-500 hover:text-cyan-400 hover:bg-cyan-950/30 transition-colors"
          aria-label={isCollapsed ? "Expand safety advisory" : "Collapse safety advisory"}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
