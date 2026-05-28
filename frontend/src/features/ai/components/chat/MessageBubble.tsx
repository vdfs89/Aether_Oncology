"use client"

import * as React from "react"
import { AIMessage } from "../../types"
import { AIAvatar } from "../primitives/AIAvatar"
import { StreamingCursor } from "../primitives/StreamingCursor"
import { StatusDot } from "../primitives/StatusDot"
import { RAGVisualizer } from "../rag/RAGVisualizer"
import { AttachmentRenderer } from "./AttachmentRenderer"
import { copilotTheme } from "../../theme"

interface MessageBubbleProps {
  message: AIMessage
  isLastActive: boolean
}

function SemanticTextRenderer({ content }: { content: string }) {
  // Simple semantic spacing: split by double line breaks to form paragraphs
  const paragraphs = content.split(/\n\n+/)

  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed whitespace-pre-wrap">
          {p}
        </p>
      ))}
    </div>
  )
}

import { InferenceSkeleton } from "../status/InferenceSkeleton"
import { ErrorSurface } from "../status/ErrorSurface"

function MessageBubbleComponent({ message, isLastActive }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex w-full gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <AIAvatar />
        </div>
      )}

      {/* Bubble Container */}
      <div 
        className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div 
          className={`
            ${copilotTheme.spacing.bubblePadding}
            ${copilotTheme.radii.bubble}
            ${isUser ? copilotTheme.colors.userBubble : copilotTheme.colors.aiBubble}
            ${copilotTheme.typography.body}
            ${isUser ? copilotTheme.colors.textBody : copilotTheme.colors.textBody}
            relative overflow-hidden
          `}
        >
          {/* User Message Content */}
          {isUser && <span className="whitespace-pre-wrap">{message.content}</span>}
          
          {/* Assistant Message Content */}
          {!isUser && (
            <div>
              {message.content && <SemanticTextRenderer content={message.content} />}
              
              {/* Skeletons for Loading States */}
              {(message.status === "thinking" || message.status === "retrieving") && !message.content && (
                <InferenceSkeleton />
              )}
              
              {/* Error Surface */}
              {message.status === "error" && (
                <ErrorSurface 
                  title="Inference Interrupted" 
                  message={message.content || "The AI runtime encountered an unexpected failure."} 
                  severity="CRITICAL"
                />
              )}

              {/* Streaming Cursor ONLY on the last active assistant message */}
              <StreamingCursor isVisible={isLastActive && message.status === "streaming"} />
            </div>
          )}
        </div>

        {/* Status Indicator for Assistant */}
        {!isUser && isLastActive && message.status !== "idle" && message.status !== "streaming" && message.status !== "complete" && message.status !== "error" && (
          <div className="mt-2 ml-4">
            <StatusDot status={message.status!} />
          </div>
        )}

        {/* Citations block - using the new RAG Visualizer */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="w-full max-w-full mt-2 ml-2">
            <RAGVisualizer citations={message.citations} />
          </div>
        )}

        {/* Predictive Attachments */}
        {!isUser && message.attachments && message.attachments.length > 0 && (
          <div className="w-full max-w-full mt-2 ml-2">
            <AttachmentRenderer attachments={message.attachments} messageId={message.id} />
          </div>
        )}
      </div>

    </div>
  )
}

// Custom comparator to prevent massive re-renders when streaming
export const MessageBubble = React.memo(MessageBubbleComponent, (prev, next) => {
  return (
    prev.isLastActive === next.isLastActive &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.citations === next.message.citations &&
    prev.message.attachments === next.message.attachments
  )
})
