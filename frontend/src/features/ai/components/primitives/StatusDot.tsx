"use client"

import { InferenceStatus } from "../../types"

interface StatusDotProps {
  status: InferenceStatus
  className?: string
}

export function StatusDot({ status, className = "" }: StatusDotProps) {
  if (status === "idle" || status === "complete" || status === "cancelled") return null

  const getStatusColor = () => {
    switch (status) {
      case "thinking": return "bg-purple-500"
      case "retrieving": return "bg-cyan-500"
      case "streaming": return "bg-cyan-400"
      case "error": return "bg-red-500"
      default: return "bg-neutral-500"
    }
  }

  const color = getStatusColor()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2 w-2">
        {(status === "thinking" || status === "retrieving" || status === "streaming") && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`}></span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
        {status}
      </span>
    </div>
  )
}
