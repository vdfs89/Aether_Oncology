import * as React from "react"
import { ConversationSession } from "../../services/persistence/db"
import { SessionItem } from "./SessionItem"

interface SessionGroupProps {
  label: string
  sessions: ConversationSession[]
  activeSessionId?: string
  onSelectSession: (session: ConversationSession) => void
}

export function SessionGroup({ label, sessions, activeSessionId, onSelectSession }: SessionGroupProps) {
  if (sessions.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
        {label}
      </h3>
      <div className="flex flex-col gap-1">
        {sessions.map(session => (
          <SessionItem 
            key={session.id} 
            session={session} 
            isActive={session.id === activeSessionId}
            onClick={onSelectSession} 
          />
        ))}
      </div>
    </div>
  )
}
