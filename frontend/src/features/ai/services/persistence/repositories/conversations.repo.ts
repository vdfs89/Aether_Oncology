import { getDB, ConversationSession } from "../db"
import { AIMessage } from "../../../types"

export class ConversationsRepo {
  static async save(session: ConversationSession): Promise<void> {
    const db = await getDB()
    const existing = await db.get("conversations", session.id)
    if (existing) {
      session.createdAt = existing.createdAt
    } else {
      session.createdAt = session.createdAt || Date.now()
    }
    session.updatedAt = Date.now()
    await db.put("conversations", session)
  }

  static async getById(id: string): Promise<ConversationSession | undefined> {
    const db = await getDB()
    return db.get("conversations", id)
  }

  static async getByPatient(patientId: string): Promise<ConversationSession[]> {
    const db = await getDB()
    return db.getAllFromIndex("conversations", "by-patient", patientId)
  }

  static async appendMessage(sessionId: string, message: AIMessage): Promise<void> {
    const db = await getDB()
    const tx = db.transaction("conversations", "readwrite")
    const store = tx.objectStore("conversations")
    const session = await store.get(sessionId)
    if (session) {
      session.messages.push(message)
      session.updatedAt = Date.now()
      await store.put(session)
    }
    await tx.done
  }
}
