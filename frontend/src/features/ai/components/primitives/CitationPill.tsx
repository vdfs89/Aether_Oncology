"use client"

interface CitationPillProps {
  index: number
  source: string
}

export function CitationPill({ index, source }: CitationPillProps) {
  // A small, inline tag to be inserted in the text
  return (
    <sup 
      className="inline-flex items-center justify-center min-w-[1.2rem] px-[2px] h-[1.2rem] ml-1 mr-0.5 rounded bg-[#1A2235] border border-[#2A344A] text-[10px] text-cyan-400 cursor-pointer hover:bg-[#2A344A] hover:text-cyan-300 transition-colors"
      title={`Source: ${source}`}
    >
      {index}
    </sup>
  )
}
