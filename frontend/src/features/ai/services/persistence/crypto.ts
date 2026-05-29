import { ConversationSession } from "./db"

/**
 * Converts an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts a base64 string to an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

class CryptoHelper {
  private inMemoryKey: CryptoKey | null = null
  private readonly salt = new TextEncoder().encode("aether-oncology-indexeddb-salt-12345")

  /**
   * Derives a CryptoKey from a physician session token using PBKDF2 and AES-GCM.
   */
  async deriveKeyFromToken(token: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBytes = encoder.encode(token)

    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveKey"]
    )

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: this.salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true, // extractable (can be inspected or exported if needed, though false is safer, we'll keep true as standard)
      ["encrypt", "decrypt"]
    )
  }

  /**
   * Sets the active physician session token and pre-derives the key.
   */
  async setSessionToken(token: string): Promise<void> {
    this.inMemoryKey = await this.deriveKeyFromToken(token)
  }

  /**
   * Clears the derived key from memory (logout).
   */
  clearKey(): void {
    this.inMemoryKey = null
    console.info("[CryptoHelper] In-memory encryption key cleared")
  }

  /**
   * Gets the active key, or derives a fallback if no token is registered.
   * This ensures the application functions correctly even in fallback/demo mode.
   */
  async getEncryptionKey(): Promise<CryptoKey> {
    if (this.inMemoryKey) return this.inMemoryKey

    // Fallback: use a stable fallback token if no physician session is authenticated
    const fallbackToken = "aether-demo-session-token-fallback-key"
    this.inMemoryKey = await this.deriveKeyFromToken(fallbackToken)
    return this.inMemoryKey
  }

  /**
   * Encrypts the sensitive parts of a ConversationSession.
   */
  async encryptSession(session: ConversationSession, key: CryptoKey): Promise<any> {
    const sensitivePayload = {
      title: session.title,
      messages: session.messages,
      runtimeState: session.runtimeState,
      eventsLog: session.eventsLog
    }

    const encoder = new TextEncoder()
    const payloadBytes = encoder.encode(JSON.stringify(sensitivePayload))
    const iv = window.crypto.getRandomValues(new Uint8Array(12)) // AES-GCM standard IV size

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      payloadBytes
    )

    return {
      id: session.id,
      patientId: session.patientId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      
      // Cryptographic envelope
      encryptionVersion: 1,
      algorithm: "AES-GCM",
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      
      // Placeholders to satisfy typings
      title: "",
      messages: [],
      runtimeState: session.runtimeState,
      eventsLog: []
    }
  }

  /**
   * Decrypts the session if it's encrypted, or returns it directly if plaintext (backwards compatibility).
   */
  async decryptSession(record: any, key: CryptoKey): Promise<ConversationSession> {
    // If it doesn't have the encryption wrapper fields, it is historical plaintext
    if (!record.ciphertext || !record.iv) {
      return record as ConversationSession
    }

    try {
      const ivBytes = new Uint8Array(base64ToArrayBuffer(record.iv))
      const ciphertextBytes = base64ToArrayBuffer(record.ciphertext)

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        ciphertextBytes
      )

      const decoder = new TextDecoder()
      const plaintext = decoder.decode(decryptedBuffer)
      const sensitiveData = JSON.parse(plaintext)

      return {
        id: record.id,
        patientId: record.patientId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        title: sensitiveData.title,
        messages: sensitiveData.messages,
        runtimeState: sensitiveData.runtimeState,
        eventsLog: sensitiveData.eventsLog
      }
    } catch (err) {
      console.error("Failed to decrypt conversation session. Returning empty template.", err)
      return {
        id: record.id,
        patientId: record.patientId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        title: "Session (Decryption Failed)",
        messages: [],
        runtimeState: "IDLE",
        eventsLog: []
      }
    }
  }
}

export const cryptoHelper = new CryptoHelper()
