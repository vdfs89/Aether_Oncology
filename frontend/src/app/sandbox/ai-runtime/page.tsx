"use client"

import * as React from "react"
import { AIProvider } from "@/features/ai/providers/AIProvider"
import { useAI, useMessages, useIsStreaming, useInferenceStatus } from "@/features/ai/hooks/useAI"
import { useStreaming } from "@/features/ai/hooks/useStreaming"
import { CopilotShell } from "@/features/ai/components/CopilotShell"
import { Button } from "@/components/ui/Button"
import { ClinicalRuntimeState, ClinicalRuntimeEvent } from "@/features/ai/orchestration/runtime/types"
import { 
  Terminal, 
  Cpu, 
  Search, 
  Wrench, 
  Link, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  ChevronRight, 
  Clock, 
  Layers 
} from "lucide-react"

const PIPELINE_STATES: ClinicalRuntimeState[] = [
  "IDLE",
  "HYDRATING",
  "PLANNING",
  "RETRIEVING",
  "EXECUTING",
  "STREAMING",
  "COMPLETED"
]

function getEventIcon(type: ClinicalRuntimeEvent["type"]) {
  switch (type) {
    case "StateTransition":
      return <Layers className="w-3.5 h-3.5 text-cyan-400" />
    case "RetrievalStarted":
      return <Search className="w-3.5 h-3.5 text-amber-400" />
    case "ToolExecuted":
      return <Wrench className="w-3.5 h-3.5 text-purple-400" />
    case "CitationAttached":
      return <Link className="w-3.5 h-3.5 text-blue-400" />
    case "MessageCreated":
      return <Terminal className="w-3.5 h-3.5 text-neutral-400" />
    case "StreamCompleted":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    case "InferenceFailed":
      return <XCircle className="w-3.5 h-3.5 text-red-500" />
    default:
      return <Activity className="w-3.5 h-3.5 text-neutral-400" />
  }
}

function SandboxWrapper() {
  const { sendMessage, cancelInference, clearHistory, state } = useAI()
  const { triggerInference, cancel } = useStreaming()

  const messages = useMessages()
  const isStreaming = useIsStreaming()
  const inferenceStatus = useInferenceStatus()

  const activeSession = state.activePatientId ? state.sessionsByPatient[state.activePatientId] : null
  const eventsLog = activeSession?.eventsLog || []
  const runtimeState = activeSession?.runtimeState || "IDLE"

  // Effect to trigger inference when a new empty assistant message is added
  React.useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.content === "" && !isStreaming && inferenceStatus === "idle") {
      // Find the last user message to extract the exact prompt entered
      const userMessages = messages.filter(m => m.role === "user")
      const lastUserMsg = userMessages[userMessages.length - 1]
      const promptText = lastUserMsg ? lastUserMsg.content : "Analyze biomarkers BRCA1"
      
      triggerInference(lastMsg.id, promptText)
    }
  }, [messages, isStreaming, inferenceStatus, triggerInference])

  return (
    <div className="h-screen w-full flex flex-col bg-[#0A0D14] overflow-hidden text-neutral-200">
      
      {/* Top Header */}
      <div className="h-12 border-b border-[#161B26] bg-[#07090E] flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold tracking-wide">AETHER CLINICAL RUNTIME SANDBOX</span>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded font-mono">
            {runtimeState}
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { cancelInference(); cancel() }} 
            className="h-7 text-xs border border-red-950/50 hover:bg-red-950/20 text-red-400"
          >
            Abort Inference
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearHistory} 
            className="h-7 text-xs border border-neutral-800 hover:bg-neutral-800/40"
          >
            Clear History
          </Button>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Interactive Copilot Chat Window */}
        <div className="flex-1 overflow-hidden relative border-r border-[#161B26] flex flex-col">
          <CopilotShell onPromptSubmit={sendMessage} />
        </div>

        {/* Right: Live Clinical Inspector Timeline & Telemetry */}
        <div className="w-[480px] flex-shrink-0 bg-[#07090E]/95 backdrop-blur-xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="h-12 border-b border-[#161B26] bg-[#07090E] flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Runtime Telemetry & Trace</span>
            </div>
            {eventsLog.length > 0 && (
              <span className="text-[10px] text-neutral-500 font-mono">
                {eventsLog[0]?.metadata?.traceId ? `Trace ID: ${eventsLog[0].metadata.traceId.slice(0, 12)}...` : ""}
              </span>
            )}
          </div>

          {/* Body Scroll area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            {/* Runtime Pipeline Graph */}
            <div className="bg-[#0D121F]/60 border border-[#161B26] rounded-lg p-4">
              <div className="text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">State Pipeline Flow</div>
              <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono">
                {PIPELINE_STATES.map((stateItem, idx) => {
                  const isActive = runtimeState === stateItem
                  const isPast = PIPELINE_STATES.indexOf(runtimeState) > idx
                  
                  return (
                    <React.Fragment key={stateItem}>
                      <div className={`px-2 py-1 rounded border transition-all duration-300 ${
                        isActive 
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)] animate-pulse"
                          : isPast
                            ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-500"
                            : "bg-neutral-900/50 border-neutral-800/50 text-neutral-600"
                      }`}>
                        {stateItem}
                      </div>
                      {idx < PIPELINE_STATES.length - 1 && (
                        <ChevronRight className={`w-3 h-3 ${isPast ? "text-emerald-800" : "text-neutral-800"}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Live Metrics HUD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0D121F]/60 border border-[#161B26] rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Active Session</div>
                <div className="text-xs font-mono font-bold mt-1 text-neutral-300 truncate">
                  {activeSession ? activeSession.id : "None"}
                </div>
              </div>
              <div className="bg-[#0D121F]/60 border border-[#161B26] rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Active Patient</div>
                <div className="text-xs font-mono font-bold mt-1 text-neutral-300">
                  {state.activePatientId || "None"}
                </div>
              </div>
              <div className="bg-[#0D121F]/60 border border-[#161B26] rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Inference Status</div>
                <div className="text-xs font-mono font-bold mt-1 flex items-center gap-1.5 capitalize text-cyan-400">
                  <Activity className="w-3 h-3 animate-pulse" />
                  {inferenceStatus}
                </div>
              </div>
              <div className="bg-[#0D121F]/60 border border-[#161B26] rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Event Count</div>
                <div className="text-xs font-mono font-bold mt-1 text-purple-400">
                  {eventsLog.length} published
                </div>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="space-y-4">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Event Timeline log</div>
              
              {eventsLog.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#161B26] rounded-lg text-neutral-600 text-xs">
                  No runtime events recorded yet. Type a message on the left to start.
                </div>
              ) : (
                <div className="relative border-l border-[#161B26] pl-4 ml-2 space-y-4">
                  {eventsLog.map((event, index) => {
                    const time = new Date(event.metadata.timestamp).toLocaleTimeString()
                    return (
                      <div key={index} className="relative group">
                        
                        {/* Event Dot */}
                        <div className="absolute -left-[23px] top-1 bg-[#07090E] border border-[#161B26] rounded-full p-1 group-hover:border-cyan-500/50 transition-colors">
                          {getEventIcon(event.type)}
                        </div>

                        {/* Event Card */}
                        <div className="bg-[#0D121F]/40 hover:bg-[#0D121F]/60 border border-[#161B26] hover:border-neutral-800 rounded-lg p-3 transition-all duration-200">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-neutral-300 font-mono">{event.type}</span>
                            <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {time}
                            </span>
                          </div>

                          {/* Simplified human-friendly details */}
                          <div className="text-[11px] text-neutral-400 mb-2">
                            {event.type === "StateTransition" && (
                              <span>Transition: <strong className="text-neutral-300 font-mono">{event.payload.from}</strong> → <strong className="text-cyan-400 font-mono">{event.payload.to}</strong></span>
                            )}
                            {event.type === "RetrievalStarted" && (
                              <span>RAG Query: <code className="text-amber-400 font-mono">"{event.payload.query}"</code></span>
                            )}
                            {event.type === "ToolExecuted" && (
                              <span>Executed tool <strong className="text-purple-400 font-mono">{event.payload.toolId}</strong>. Found <strong className="text-neutral-300">{event.payload.result.biomarkers?.length || 0} biomarkers</strong>.</span>
                            )}
                            {event.type === "CitationAttached" && (
                              <span>Source: <strong className="text-blue-400">{event.payload.source}</strong> · Relevance: <strong className="text-neutral-300">{Math.round(event.payload.relevance * 100)}%</strong></span>
                            )}
                            {event.type === "StreamCompleted" && (
                              <span>Finished. Evaluated <strong className="text-emerald-500">{event.payload.totalTokens} tokens</strong>.</span>
                            )}
                            {event.type === "InferenceFailed" && (
                              <span className="text-red-400">Error: {event.payload.error}</span>
                            )}
                          </div>

                          {/* Accordion showing Raw JSON metadata */}
                          <details className="mt-1">
                            <summary className="text-[10px] text-neutral-500 hover:text-cyan-400 cursor-pointer select-none font-mono">
                              Raw Payload
                            </summary>
                            <div className="mt-2 text-[10px] bg-[#05070B] border border-neutral-900 rounded p-2 overflow-x-auto font-mono text-cyan-400">
                              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                              <div className="border-t border-neutral-900 mt-2 pt-2 text-neutral-500">
                                <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default function SandboxPage() {
  return (
    <AIProvider>
      <SandboxWrapper />
    </AIProvider>
  )
}
