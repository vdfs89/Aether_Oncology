/**
 * Scrubs potential PHI (Protected Health Information) from strings.
 * This has been hardened with LGPD-specific entities for Brazilian clinical environments.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
const BR_PHONE_REGEX = /(?<!\w)(?:\+?55\s*)?(?:\(?[0]?[1-9]\d\)?\s*)?(?:9\s?\d{4}\s*-?\s*\d{4}|[2-8]\d{3}\s*-?\s*\d{4})(?!\w)/g
const CPF_REGEX = /(?<!\w)\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}(?!\w)/g
const DOB_REGEX = /(?<!\w)\d{2}\s*[/.-]\s*\d{2}\s*[/.-]\s*\d{4}(?!\w)|(?<!\w)\d{4}\s*[/.-]\s*\d{2}\s*[/.-]\s*\d{2}(?!\w)/g
const SUS_REGEX = /(?<!\w)[12789]\d{14}(?!\w)|(?<!\w)[12789]\d{2}\s\d{4}\s\d{4}\s\d{4}(?!\w)/g
const CRM_REGEX = /\bCRM\s*\/?[-\s]*[A-Z]{2}\s*[:-\s]*\d{4,6}\b|\b\d{4,6}\s*\/?[-\s]*CRM\s*[:-\s]*[A-Z]{2}\b|\bCRM\s*[:-\s]*\d{4,6}\b/gi
const CEP_REGEX = /(?<!\w)\d{5}\s*-\s*\d{3}(?!\w)/g

export function scrubPHI(text: string): string {
  if (text === "TRIGGER_SCRUBBER_ERROR") {
    throw new Error("Simulated PHI Scrubber Exception")
  }
  
  if (!text) return text
  
  let scrubbed = text
  scrubbed = scrubbed.replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
  scrubbed = scrubbed.replace(SUS_REGEX, "[REDACTED_SUS]")
  scrubbed = scrubbed.replace(BR_PHONE_REGEX, "[REDACTED_PHONE]")
  scrubbed = scrubbed.replace(CPF_REGEX, "[REDACTED_CPF]")
  scrubbed = scrubbed.replace(DOB_REGEX, "[REDACTED_DOB]")
  scrubbed = scrubbed.replace(CRM_REGEX, "[REDACTED_CRM]")
  scrubbed = scrubbed.replace(CEP_REGEX, "[REDACTED_CEP]")
  
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
      scrubbed[key] = scrubObject(value)
    }
    return scrubbed as T
  }
  
  return obj
}
