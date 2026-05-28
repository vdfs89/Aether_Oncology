"use client"

import { useEffect, useState } from "react"

interface StreamingCursorProps {
  isVisible: boolean
}

export function StreamingCursor({ isVisible }: StreamingCursorProps) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    if (!isVisible) return
    const interval = setInterval(() => setPulse(p => !p), 600) // 1.2s cadence (600ms on, 600ms off)
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  // ▍ symbol or simple block with cyan glow
  return (
    <span 
      className={`inline-block ml-1 text-cyan-400 transition-opacity duration-300 ease-in-out ${pulse ? "opacity-100" : "opacity-30"}`}
      style={{ textShadow: "0 0 8px rgba(34,211,238,0.6)" }}
    >
      ▍
    </span>
  )
}
