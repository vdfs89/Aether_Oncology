"use client"

import * as React from "react"
import { useState } from "react"
import { Citation } from "../../types"
import { EvidenceGraph } from "./EvidenceGraph"
import { RetrievalTimeline } from "./RetrievalTimeline"
import { ChunkInspector } from "./ChunkInspector"

interface RAGVisualizerProps {
  citations: Citation[]
}

export function RAGVisualizer({ citations }: RAGVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"inspector" | "graph" | "timeline">("inspector")

  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-4 border border-slate-800 rounded-lg overflow-hidden bg-[#0A0D14]">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 p-2 bg-slate-900/50">
        <TabButton 
          active={activeTab === "inspector"} 
          onClick={() => setActiveTab("inspector")}
        >
          Chunk Inspector
        </TabButton>
        <TabButton 
          active={activeTab === "graph"} 
          onClick={() => setActiveTab("graph")}
        >
          Evidence Graph
        </TabButton>
        <TabButton 
          active={activeTab === "timeline"} 
          onClick={() => setActiveTab("timeline")}
        >
          Retrieval Timeline
        </TabButton>
      </div>

      {/* Content Area */}
      <div className="p-4 h-64 overflow-y-auto custom-scrollbar">
        {activeTab === "inspector" && <ChunkInspector citations={citations} />}
        {activeTab === "graph" && <EvidenceGraph citations={citations} />}
        {activeTab === "timeline" && <RetrievalTimeline citations={citations} />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active 
          ? "bg-slate-800 text-cyan-400 border border-slate-700" 
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
      }`}
    >
      {children}
    </button>
  )
}
