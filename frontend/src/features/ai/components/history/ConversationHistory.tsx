import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { useAI } from "../../hooks/useAI"
import { ConversationsRepo } from "../../services/persistence/repositories/conversations.repo"
import { ConversationSession } from "../../services/persistence/db"
import { hydrateSession } from "../../state/ai.actions"
import { SessionGroup } from "./SessionGroup"
import { Loader2, PlusCircle } from "lucide-react"
import { nanoid } from "nanoid"

export function ConversationHistory() {
  const { state, dispatch } = useAI()
  const { activePatientId, sessionsByPatient } = state

  const [history, setHistory] = useState<ConversationSession[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch from DB when activePatientId changes
  useEffect(() => {
    if (!activePatientId) return
    let isMounted = true
    setIsLoading(true)
    
    ConversationsRepo.getByPatient(activePatientId).then(sessions => {
      if (!isMounted) return
      // Sort by updatedAt desc
      sessions.sort((a, b) => b.updatedAt - a.updatedAt)
      setHistory(sessions)
      setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [activePatientId])

  // Also include the in-memory active session in the list so that
  // optimistic updates (like title changes or typing) reflect immediately
  const combinedHistory = useMemo(() => {
    if (!activePatientId) return []
    const activeSession = sessionsByPatient[activePatientId]
    if (!activeSession) return history

    const others = history.filter(s => s.id !== activeSession.id)
    const combined = [activeSession, ...others]
    combined.sort((a, b) => b.updatedAt - a.updatedAt)
    return combined
  }, [history, sessionsByPatient, activePatientId])

  // Grouping logic (Today, Yesterday, Previous 7 Days, Older)
  const grouped = useMemo(() => {
    const groups: Record<string, ConversationSession[]> = {
      "Today": [],
      "Yesterday": [],
      "Previous 7 Days": [],
      "Older": []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    combinedHistory.forEach(session => {
      const d = new Date(session.updatedAt)
      if (d >= today) groups["Today"].push(session)
      else if (d >= yesterday) groups["Yesterday"].push(session)
      else if (d >= lastWeek) groups["Previous 7 Days"].push(session)
      else groups["Older"].push(session)
    })

    return groups
  }, [combinedHistory])

  const handleSelectSession = (session: ConversationSession) => {
    if (!activePatientId) return
    // Hydrate the session into the reducer
    dispatch(hydrateSession(activePatientId, session))
  }

  const handleNewChat = () => {
    if (!activePatientId) return
    // To start a new chat, we just hydrate a blank session
    const blankSession: ConversationSession = {
      id: nanoid(),
      patientId: activePatientId,
      title: "New Session",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    }
    dispatch(hydrateSession(activePatientId, blankSession))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-6">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    )
  }

  const activeSessionId = activePatientId ? sessionsByPatient[activePatientId]?.id : undefined

  return (
    <div className="flex flex-col h-full bg-[#0B1120] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Session History</h2>
        <button 
          onClick={handleNewChat}
          className="text-slate-400 hover:text-white transition-colors"
          title="New clinical session"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {combinedHistory.length === 0 ? (
          <div className="text-center p-4 text-sm text-slate-500">
            No previous sessions for this patient.
          </div>
        ) : (
          <>
            <SessionGroup label="Today" sessions={grouped["Today"]} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} />
            <SessionGroup label="Yesterday" sessions={grouped["Yesterday"]} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} />
            <SessionGroup label="Previous 7 Days" sessions={grouped["Previous 7 Days"]} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} />
            <SessionGroup label="Older" sessions={grouped["Older"]} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} />
          </>
        )}
      </div>
    </div>
  )
}
