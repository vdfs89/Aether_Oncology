"use client"

import * as React from "react"
import { useRef, useEffect } from "react"
import { AIMessage } from "../../types"
import { MessageBubble } from "./MessageBubble"
import { copilotTheme } from "../../theme"

interface ConversationViewProps {
  messages: AIMessage[]
  isStreaming: boolean
  activeMessageId?: string
}

export function ConversationView({ messages, isStreaming, activeMessageId }: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAutoScrollEnabled = useRef(true)

  // Scroll Event Handler to determine if the user has manually scrolled up
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return

    // Heuristic: If we are close to the bottom (threshold 120px), enable auto-scroll.
    // If the user scrolls up past the threshold, disable auto-scroll.
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAutoScrollEnabled.current = distanceToBottom < 120
  }

  // Auto-scroll logic using requestAnimationFrame for smoothness during streaming
  useEffect(() => {
    if (!isStreaming) return

    let rafId: number

    const updateScroll = () => {
      const el = scrollRef.current
      if (el && isAutoScrollEnabled.current) {
        el.scrollTop = el.scrollHeight
      }
      // Keep checking while streaming
      rafId = requestAnimationFrame(updateScroll)
    }

    rafId = requestAnimationFrame(updateScroll)

    return () => cancelAnimationFrame(rafId)
  }, [isStreaming])

  // Optional: Auto-scroll when a completely new message is added (e.g., user sends prompt)
  useEffect(() => {
    const el = scrollRef.current
    if (el && isAutoScrollEnabled.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 w-full overflow-y-auto scroll-smooth"
    >
      <div className={`flex flex-col mx-auto max-w-4xl py-10 ${copilotTheme.spacing.containerPadding} ${copilotTheme.spacing.chatGutter}`}>
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-950/30 flex items-center justify-center border border-cyan-900/50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-medium text-neutral-200">Aether Copilot</h2>
              <p className="text-sm text-neutral-500 mt-2">Inteligência Clínica e Análise de Biomarcadores</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isLastActive={msg.id === activeMessageId} 
          />
        ))}

        {/* Extra padding at the bottom so the last message isn't flush with the input box */}
        <div className="h-8" />
      </div>
    </div>
  )
}
