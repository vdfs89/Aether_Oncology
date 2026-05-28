"use client"

import { Citation } from "../../types"

interface CitationCardProps {
  citation: Citation
  index: number
}

export function CitationCard({ citation, index }: CitationCardProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#0A0D14] border border-[#1A2235] hover:border-cyan-900/50 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 group-hover:text-cyan-500 transition-colors">
          [{index}] {citation.source}
        </span>
        <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          {Math.round(citation.relevance * 100)}% Match
        </span>
      </div>
      <h4 className="text-sm text-neutral-300 leading-tight line-clamp-2">
        {citation.title}
      </h4>
    </div>
  )
}

interface CitationListProps {
  citations: Citation[]
}

export function CitationList({ citations }: CitationListProps) {
  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#1A2235]">
      <div className="text-xs text-neutral-500 mb-3 uppercase tracking-wider font-medium">
        Evidências Clínicas
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {citations.map((c, i) => (
          <CitationCard key={c.id} citation={c} index={i + 1} />
        ))}
      </div>
    </div>
  )
}
