"use client"

import * as React from "react"
import { useRef, useEffect } from "react"

interface PromptInputProps {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function PromptInput({ value, onChange, onSubmit, disabled, placeholder = "Investigar paciente ou biomarcadores..." }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize logic up to 220px
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to recalculate
    textarea.style.height = "auto"
    // Calculate new height
    const newHeight = Math.min(textarea.scrollHeight, 220)
    textarea.style.height = `${newHeight}px`
    
    // If it reaches max height, enable internal scroll
    textarea.style.overflowY = textarea.scrollHeight > 220 ? "auto" : "hidden"
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSubmit()
      }
    }
  }

  return (
    <div className="relative flex items-end w-full bg-[#121622] border border-[#1A2235] rounded-2xl focus-within:border-cyan-900/50 focus-within:ring-1 focus-within:ring-cyan-900/50 transition-all p-2">
      
      {/* Future: Attachment / Actions button on the left */}
      <button 
        type="button"
        className="p-2 text-neutral-500 hover:text-cyan-400 transition-colors flex-shrink-0"
        aria-label="Add attachment"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 max-h-[220px] min-h-[24px] bg-transparent text-neutral-200 placeholder:text-neutral-600 resize-none outline-none py-2 px-2 text-[15px] leading-relaxed"
        rows={1}
      />

      {/* Submit button on the right */}
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className={`p-2 rounded-xl transition-all flex-shrink-0 ${
          value.trim() && !disabled 
            ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" 
            : "text-neutral-600 bg-transparent"
        }`}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  )
}
