/**
 * Scrubs potential PHI (Protected Health Information) from strings.
 * This is a foundational layer. In a real MedTech app, this is heavily augmented
 * with NLP and specific regex boundaries.
 */

// Basic naive regex for demonstration
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g
const SSN_CPF_REGEX = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{2}\b/g

export function scrubPHI(text: string): string {
  if (!text) return text
  
  let scrubbed = text
  scrubbed = scrubbed.replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
  scrubbed = scrubbed.replace(PHONE_REGEX, "[REDACTED_PHONE]")
  scrubbed = scrubbed.replace(SSN_CPF_REGEX, "[REDACTED_ID]")
  
  return scrubbed
}

export function scrubObject<T>(obj: T): T {
  if (!obj) return obj
  if (typeof obj === "string") return scrubPHI(obj) as any
  
  if (Array.isArray(obj)) {
    return obj.map(item => scrubObject(item)) as any
  }
  
  if (typeof obj === "object") {
    const scrubbed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Also check keys if they might contain sensitive data, though rare
      scrubbed[key] = scrubObject(value)
    }
    return scrubbed as T
  }
  
  return obj
}
