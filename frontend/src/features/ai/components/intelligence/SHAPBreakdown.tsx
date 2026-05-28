"use client"

import { ExplainabilityData } from "../../contracts"

interface SHAPBreakdownProps {
  explainability: ExplainabilityData
}

export function SHAPBreakdown({ explainability }: SHAPBreakdownProps) {
  // A Bloomberg-style SHAP plot (feature impacts)
  // Max impact to scale the bars relative to the strongest feature
  const maxImpact = Math.max(...explainability.features.map(f => Math.abs(f.impact)), 0.1)

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between mb-1 border-b border-[#1A2235] pb-2">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
          Model Feature Impact (SHAP)
        </h4>
        <span className="text-[10px] text-neutral-600 font-mono">
          f(x) Explanation
        </span>
      </div>

      <div className="flex flex-col gap-2 font-mono">
        {explainability.features.map((feature, i) => {
          const isPositive = feature.impact >= 0
          const barWidth = `${(Math.abs(feature.impact) / maxImpact) * 100}%`
          
          return (
            <div key={i} className="flex items-center gap-4 text-xs">
              
              <div className="w-24 text-right truncate text-neutral-400 font-medium">
                {feature.name}
              </div>

              {/* Zero line centered breakdown */}
              <div className="flex-1 flex items-center h-4 relative">
                {/* Center axis */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#2A344A]" />
                
                {/* Negative impact (left side of axis) */}
                <div className="flex-1 flex justify-end">
                  {!isPositive && (
                    <div 
                      className="h-2 bg-emerald-500/80 rounded-l-[1px]" 
                      style={{ width: barWidth }} 
                    />
                  )}
                </div>

                {/* Positive impact (right side of axis) */}
                <div className="flex-1 flex justify-start">
                  {isPositive && (
                    <div 
                      className="h-2 bg-rose-500/80 rounded-r-[1px]" 
                      style={{ width: barWidth }} 
                    />
                  )}
                </div>
              </div>

              <div className={`w-12 text-right ${isPositive ? "text-rose-400" : "text-emerald-400"}`}>
                {isPositive ? "+" : ""}{feature.impact.toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
