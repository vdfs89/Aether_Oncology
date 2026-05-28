import { openDB, DBSchema, IDBPDatabase } from "idb"
import { AIMessage } from "../../types"
import { ClinicalRuntimeState, ClinicalRuntimeEvent } from "../../orchestration/runtime/types"

// Extending the generic contracts for local persistence
export interface ConversationSession {
  id: string
  patientId: string
  title: string
  createdAt: number
  updatedAt: number
  messages: AIMessage[]
  runtimeState?: ClinicalRuntimeState
  eventsLog?: ClinicalRuntimeEvent[]
}

export interface PatientContextRecord {
  patientId: string
  data: Record<string, any> // Mocking PatientContext for now
  updatedAt: number
}

export interface InferenceTraceRecord {
  traceId: string
  conversationId: string
  modelMetadata: Record<string, any>
  createdAt: number
}

export interface AetherDB extends DBSchema {
  conversations: {
    key: string
    value: ConversationSession
    indexes: { "by-patient": string; "by-updated": number }
  }
  patient_context: {
    key: string
    value: PatientContextRecord
  }
  traces: {
    key: string
    value: InferenceTraceRecord
    indexes: { "by-conversation": string }
  }
}

let dbPromise: Promise<IDBPDatabase<AetherDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AetherDB>("aether-clinical-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("conversations")) {
          const store = db.createObjectStore("conversations", { keyPath: "id" })
          store.createIndex("by-patient", "patientId")
          store.createIndex("by-updated", "updatedAt")
        }
        if (!db.objectStoreNames.contains("patient_context")) {
          db.createObjectStore("patient_context", { keyPath: "patientId" })
        }
        if (!db.objectStoreNames.contains("traces")) {
          const store = db.createObjectStore("traces", { keyPath: "traceId" })
          store.createIndex("by-conversation", "conversationId")
        }
      }
    })
  }
  return dbPromise
}
