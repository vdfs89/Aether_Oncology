"use client"

import { copilotTheme } from "../../theme"

interface AIAvatarProps {
  className?: string
}

export function AIAvatar({ className = "" }: AIAvatarProps) {
  // Minimalist orb/glyph per requirements
  return (
    <div 
      className={`relative flex items-center justify-center w-8 h-8 rounded-full bg-[#0A0D14] border border-cyan-900/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <div className="w-3 h-3 rounded-full bg-cyan-400 opacity-80" />
      <div className="absolute inset-0 rounded-full border border-cyan-400/20" />
    </div>
  )
}
