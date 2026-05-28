/**
 * src/features/ai/hooks/useSessionHydration.ts
 * 
 * Manages the synchronization between the active AI Reducer session
 * and the IndexedDB persistence layer.
 */
import { useEffect } from "react"
import { useAI } from "./useAI"
import { ConversationsRepo } from "../services/persistence/repositories/conversations.repo"
import { hydrateSession } from "../state/ai.actions"

export function useSessionHydration() {
  const { state, dispatch } = useAI()
  const { activePatientId, sessionsByPatient } = state

  // 1. Initial Load / Hydration
  useEffect(() => {
    if (!activePatientId) return
    const sessionInMemory = sessionsByPatient[activePatientId]

    // If session has messages, it's already hydrated or we just typed something
    if (sessionInMemory && sessionInMemory.messages.length > 0) return

    let isMounted = true

    ConversationsRepo.getByPatient(activePatientId)
      .then(sessions => {
        if (!isMounted) return
        if (sessions.length > 0) {
          // Sort by updatedAt descending
          sessions.sort((a, b) => b.updatedAt - a.updatedAt)
          const latestSession = sessions[0]
          dispatch(hydrateSession(activePatientId, latestSession))
        }
      })
      .catch(err => {
        console.error("Failed to hydrate session from IndexedDB", err)
      })

    return () => { isMounted = false }
  }, [activePatientId, dispatch]) // Intentionally not depending on sessionsByPatient to avoid loop

  // 2. Snapshot Loop
  useEffect(() => {
    if (!activePatientId) return
    const activeSession = sessionsByPatient[activePatientId]
    if (!activeSession) return
    
    // Only save if there are messages
    if (activeSession.messages.length === 0) return

    const timer = setTimeout(() => {
      ConversationsRepo.save({
        id: activeSession.id,
        patientId: activePatientId,
        title: activeSession.title,
        createdAt: Date.now(), // Repository will preserve existing createdAt
        updatedAt: Date.now(),
        messages: activeSession.messages,
        runtimeState: activeSession.runtimeState,
        eventsLog: activeSession.eventsLog
      }).catch(err => {
        console.error("Failed to persist session to IndexedDB", err)
      })
    }, 1000) // Debounce persistence by 1s

    return () => clearTimeout(timer)
  }, [activePatientId, sessionsByPatient])
}
