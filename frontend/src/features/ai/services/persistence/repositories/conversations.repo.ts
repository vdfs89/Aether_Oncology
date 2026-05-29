import { getDB, ConversationSession } from "../db"
import { AIMessage } from "../../../types"
import { cryptoHelper } from "../crypto"

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

    const key = await cryptoHelper.getEncryptionKey()
    const encrypted = await cryptoHelper.encryptSession(session, key)
    await db.put("conversations", encrypted)
  }

  static async getById(id: string): Promise<ConversationSession | undefined> {
    const db = await getDB()
    const record = await db.get("conversations", id)
    if (!record) return undefined

    const key = await cryptoHelper.getEncryptionKey()
    return cryptoHelper.decryptSession(record, key)
  }

  static async getByPatient(patientId: string): Promise<ConversationSession[]> {
    const db = await getDB()
    const records = await db.getAllFromIndex("conversations", "by-patient", patientId)

    const key = await cryptoHelper.getEncryptionKey()
    return Promise.all(records.map(record => cryptoHelper.decryptSession(record, key)))
  }

  static async appendMessage(sessionId: string, message: AIMessage): Promise<void> {
    const db = await getDB()
    const tx = db.transaction("conversations", "readwrite")
    const store = tx.objectStore("conversations")
    const record = await store.get(sessionId)
    if (record) {
      const key = await cryptoHelper.getEncryptionKey()
      const session = await cryptoHelper.decryptSession(record, key)
      session.messages.push(message)
      session.updatedAt = Date.now()

      const encrypted = await cryptoHelper.encryptSession(session, key)
      await store.put(encrypted)
    }
    await tx.done
  }
}
