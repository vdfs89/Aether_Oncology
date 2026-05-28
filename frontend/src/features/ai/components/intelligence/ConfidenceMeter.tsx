"use client"

import { copilotTheme } from "../../theme"

interface ConfidenceMeterProps {
  score: number // 0.0 to 1.0
}

export function ConfidenceMeter({ score }: ConfidenceMeterProps) {
  // A segmented clinical gauge, minimalist and scientific.
  const percentage = Math.round(score * 100)
  
  // High confidence: >80%, Moderate: 50-80%, Low: <50%
  const signalQuality = score > 0.8 ? "HIGH" : score > 0.5 ? "MODERATE" : "LOW"
  const colorClass = score > 0.8 ? "text-cyan-400" : score > 0.5 ? "text-amber-400" : "text-rose-400"
  const bgClass = score > 0.8 ? "bg-cyan-400" : score > 0.5 ? "bg-amber-400" : "bg-rose-400"

  // Create segments for the bar (e.g. 20 segments)
  const segments = Array.from({ length: 20 }, (_, i) => i * 5)

  return (
    <div className="flex flex-col gap-1 w-full max-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
          Signal Quality
        </span>
        <span className={`text-[10px] font-mono font-medium ${colorClass}`}>
          {signalQuality} ({percentage}%)
        </span>
      </div>
      
      <div className="flex gap-[2px] h-2">
        {segments.map((threshold) => (
          <div 
            key={threshold} 
            className={`flex-1 rounded-[1px] ${
              percentage > threshold ? bgClass : "bg-[#1A2235]"
            } transition-colors duration-500`} 
          />
        ))}
      </div>
    </div>
  )
}
