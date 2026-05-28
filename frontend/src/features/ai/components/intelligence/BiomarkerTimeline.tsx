"use client"

import { Biomarker } from "../../contracts"

interface BiomarkerTimelineProps {
  biomarkers: Biomarker[]
}

export function BiomarkerTimeline({ biomarkers }: BiomarkerTimelineProps) {
  if (!biomarkers || biomarkers.length === 0) return null

  const getTrendIcon = (trend: Biomarker["trend"]) => {
    switch (trend) {
      case "up": return <span className="text-rose-400 font-bold">↑</span>
      case "down": return <span className="text-emerald-400 font-bold">↓</span>
      case "stable": return <span className="text-neutral-500 font-bold">—</span>
    }
  }

  const isOutOfRange = (val: number, [min, max]: [number, number]) => val < min || val > max

  return (
    <div className="flex flex-col gap-2 mt-4 border border-[#1A2235] bg-[#0A0D14] rounded-xl p-4">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">
        Biomarker Trajectory
      </h4>

      <div className="flex flex-col gap-3">
        {biomarkers.map(b => {
          const outOfRange = isOutOfRange(b.value, b.referenceRange)
          
          return (
            <div key={b.id} className="flex items-center justify-between text-sm">
              
              <div className="flex items-center gap-3">
                <div className="w-4 text-center">{getTrendIcon(b.trend)}</div>
                <div className="font-medium text-neutral-300 w-16">{b.name}</div>
              </div>

              {/* Sparkline simulation via simple progress bar logic relative to reference range */}
              <div className="flex-1 hidden sm:flex items-center justify-center px-4">
                <div className="w-full h-1 bg-[#1A2235] rounded-full relative max-w-[120px]">
                  {/* Reference range represented implicitly as the bar */}
                  {/* The value indicator */}
                  <div 
                    className={`absolute w-2 h-2 rounded-full -top-[2px] ${outOfRange ? "bg-rose-400" : "bg-emerald-400"}`}
                    style={{ 
                      // Simple relative positioning heuristic
                      left: `${Math.min(Math.max(((b.value - (b.referenceRange[0] * 0.5)) / ((b.referenceRange[1] * 1.5) - (b.referenceRange[0] * 0.5))) * 100, 0), 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="text-right flex items-center gap-2">
                <span className={`font-mono ${outOfRange ? "text-rose-400 font-bold" : "text-neutral-300"}`}>
                  {b.value}
                </span>
                <span className="text-xs text-neutral-500 w-12">{b.unit}</span>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
