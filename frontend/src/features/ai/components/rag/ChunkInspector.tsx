"use client"

import * as React from "react"
import { Citation } from "../../types"

export function ChunkInspector({ citations }: { citations: Citation[] }) {
  const [selectedCitationId, setSelectedCitationId] = React.useState<string | null>(
    citations.length > 0 ? citations[0].id : null
  )

  const selectedCitation = citations.find(c => c.id === selectedCitationId)

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar List */}
      <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar border-r border-slate-800">
        {citations.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setSelectedCitationId(c.id)}
            className={`text-left p-2 rounded-md transition-colors ${
              selectedCitationId === c.id 
                ? "bg-slate-800 border-slate-700" 
                : "hover:bg-slate-800/50"
            }`}
          >
            <div className="text-[10px] text-cyan-500 font-mono mb-1">[{i + 1}] {c.source}</div>
            <div className="text-xs text-slate-300 line-clamp-2">{c.title}</div>
            <div className="text-[10px] text-emerald-500 mt-1">
              Match: {Math.round(c.relevance * 100)}%
            </div>
          </button>
        ))}
      </div>

      {/* Details View */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {selectedCitation ? (
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-2">
              {selectedCitation.title}
            </h4>
            <div className="flex gap-4 text-[10px] text-slate-500 font-mono mb-4">
              <span>ID: {selectedCitation.id}</span>
              <span>Relevance: {selectedCitation.relevance.toFixed(3)}</span>
            </div>
            {/* Snippet text */}
            <div className="text-xs text-slate-400 leading-relaxed p-3 bg-slate-900 rounded-md border border-slate-800">
              {selectedCitation.snippet || "No snippet available."}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 flex items-center justify-center h-full">
            Select a citation to inspect.
          </div>
        )}
      </div>
    </div>
  )
}
