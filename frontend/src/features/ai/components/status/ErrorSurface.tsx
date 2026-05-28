"use client"

import * as React from "react"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { SemanticSeverity, semanticTheme } from "../../theme/semantic"

interface ErrorSurfaceProps {
  title: string
  message: string
  severity?: SemanticSeverity
  onRetry?: () => void
}

export function ErrorSurface({ 
  title, 
  message, 
  severity = "WARNING",
  onRetry 
}: ErrorSurfaceProps) {
  const theme = semanticTheme[severity] || semanticTheme.WARNING

  return (
    <div className={`mt-3 p-4 rounded-lg border ${theme.border} ${theme.bg} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${theme.color} flex-shrink-0 mt-0.5`} />
        <div className="flex flex-col gap-1 flex-1">
          <span className={`text-sm font-semibold tracking-wide uppercase ${theme.color}`}>
            {title}
          </span>
          <span className="text-[13px] text-neutral-300 leading-relaxed">
            {message}
          </span>
        </div>
      </div>
      
      {onRetry && (
        <div className="flex justify-end mt-1">
          <button 
            onClick={onRetry}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors
              border ${theme.border} ${theme.color} hover:bg-white/5`}
          >
            <RefreshCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
