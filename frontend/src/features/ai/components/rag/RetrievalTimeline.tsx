"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Citation } from "../../types"

export function RetrievalTimeline({ citations }: { citations: Citation[] }) {
  return (
    <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar bg-[#0B1120] border border-[#1A2235] rounded">
      <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
        
        {citations.map((c, i) => (
          <motion.div 
            key={c.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            {/* Timeline dot */}
            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-700 bg-slate-900 text-slate-400 group-[.is-active]:text-emerald-500 group-[.is-active]:border-emerald-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <span className="text-[10px] font-mono">{i + 1}</span>
            </div>
            
            {/* Content Card */}
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-800 bg-slate-800/50 shadow-sm">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-slate-300 text-xs">{c.source}</div>
                <time className="font-mono text-[9px] text-slate-500">
                  {(c.relevance * 100).toFixed(1)}% Match
                </time>
              </div>
              <div className="text-slate-400 text-[11px] line-clamp-2">
                {c.title}
              </div>
            </div>
          </motion.div>
        ))}

      </div>
    </div>
  )
}
