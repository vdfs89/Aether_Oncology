import React from "react"
import { ExecutionStage } from "../../tools/types"
import { Activity, Database, Stethoscope, Dna, FileText } from "lucide-react"

interface ApprovalToolCardProps {
  stageIndex: number
  stage: ExecutionStage
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  "biomarker-analysis": Dna,
  "therapy-matching": Stethoscope,
  "clinical-guidelines-rag": FileText,
  "default": Activity
}

export function ApprovalToolCard({ stageIndex, stage }: ApprovalToolCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        Stage {stageIndex + 1}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {stage.tools.map((tool: any, idx: number) => {
          const Icon = TOOL_ICONS[tool.toolId] || TOOL_ICONS["default"]
          return (
            <div 
              key={`${tool.toolId}-${idx}`}
              className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="p-2 rounded-md bg-white/5 text-zinc-400">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200">
                  {tool.toolId}
                </div>
                <div className="text-xs text-zinc-500 font-mono mt-1 truncate">
                  {JSON.stringify(tool.args)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
