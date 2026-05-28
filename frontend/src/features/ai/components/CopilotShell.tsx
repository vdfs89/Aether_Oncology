"use client"

import * as React from "react"
import { useAI, useMessages, useIsStreaming, useActiveMessageId } from "../hooks/useAI"
import { ConversationView } from "./chat/ConversationView"
import { PromptInput } from "./chat/PromptInput"
import { CopilotSidebar } from "./chat/CopilotSidebar"
import { ConversationHistory } from "./history/ConversationHistory"
import { SafetyRibbon } from "./status/SafetyRibbon"
import { copilotTheme } from "../theme"
import { ClinicalApprovalPanel } from "./approval/ClinicalApprovalPanel"

interface CopilotShellProps {
  onPromptSubmit: (prompt: string) => void
}

export function CopilotShell({ onPromptSubmit }: CopilotShellProps) {
  const { state } = useAI()
  const messages = useMessages()
  const isStreaming = useIsStreaming()
  const activeMessageId = useActiveMessageId()
  
  const [prompt, setPrompt] = React.useState("")

  const handleSubmit = () => {
    if (!prompt.trim() || isStreaming) return
    onPromptSubmit(prompt)
    setPrompt("")
  }

  return (
    <div className={`flex w-full h-full overflow-hidden ${copilotTheme.colors.surface}`}>
      
      {/* Session History Sidebar (Left) */}
      <div className="w-64 flex-shrink-0 hidden md:block">
        <ConversationHistory />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full relative">
        <SafetyRibbon />
        <ConversationView 
          messages={messages} 
          isStreaming={isStreaming} 
          activeMessageId={activeMessageId} 
        />
        
        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14] to-transparent pt-10">
          <div className="max-w-4xl mx-auto">
            <PromptInput 
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              disabled={isStreaming}
            />
            <div className="text-center mt-3 text-[10px] text-neutral-600">
              Aether AI can make mistakes. Verify clinical findings against original sources.
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Sidebar */}
      <CopilotSidebar />

      {/* Clinical Approval Overlay */}
      <ClinicalApprovalPanel />

    </div>
  )
}
