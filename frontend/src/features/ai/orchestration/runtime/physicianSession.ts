/**
 * src/features/ai/orchestration/runtime/physicianSession.ts
 *
 * Clinical Physician Identity Layer.
 *
 * Manages the identity of the authenticated physician for the current session.
 * This is the single source of truth for `physicianId` across:
 *   - ClinicalApprovalPanel (standard approve/reject)
 *   - OverridePanel (approve with mutations)
 *   - approvalManager (governance events)
 *   - Event Sourcing / audit trail
 *
 * Architecture note:
 *   This is a lightweight identity layer — not a full auth system.
 *   In production, `physicianId` should be sourced from the hospital SSO/SAML token
 *   (Epic MyChart, Microsoft Entra Health, etc.).
 *   For MVP, it reads from a browser session store with a structured PhysicianProfile.
 */

export interface PhysicianProfile {
  /** Unique physician identifier — CRM number in Brazil, NPI in US */
  physicianId: string
  /** Display name for the approval audit trail */
  displayName: string
  /** Medical specialty — used for routing and risk context */
  specialty: string
  /** CRM registration number (Brazil) */
  crm?: string
  /** ISO timestamp when the session was authenticated */
  authenticatedAt: number
  /** Session token hash — opaque, not the raw token */
  sessionTokenHash?: string
}

const SESSION_STORAGE_KEY = "aether:physician_session"
const FALLBACK_PHYSICIAN: PhysicianProfile = {
  physicianId: "PHYSICIAN_NOT_AUTHENTICATED",
  displayName: "Physician (Demo Mode)",
  specialty: "Oncology",
  crm: undefined,
  authenticatedAt: Date.now(),
}

class PhysicianSessionManager {
  private _profile: PhysicianProfile | null = null

  /**
   * Returns the currently authenticated physician profile.
   * Falls back to a demo profile if no session is set.
   * In production: validate session token expiry here.
   */
  getProfile(): PhysicianProfile {
    if (this._profile) return this._profile

    // Try to restore from sessionStorage (survives page refresh, not tab close)
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PhysicianProfile
        // Basic freshness check — 8-hour clinical session
        const SESSION_TTL_MS = 8 * 60 * 60 * 1000
        if (Date.now() - parsed.authenticatedAt < SESSION_TTL_MS) {
          this._profile = parsed
          return this._profile
        }
        this.clearSession()
      }
    } catch {
      // sessionStorage unavailable (e.g. SSR) — return fallback
    }

    return FALLBACK_PHYSICIAN
  }

  /** Current physician ID — used in all governance events */
  get physicianId(): string {
    return this.getProfile().physicianId
  }

  /** Whether a real physician is authenticated (not demo fallback) */
  get isAuthenticated(): boolean {
    const profile = this.getProfile()
    return profile.physicianId !== FALLBACK_PHYSICIAN.physicianId
  }

  /**
   * Authenticates a physician for this session.
   * In production: called after hospital SSO callback with validated claims.
   */
  authenticate(profile: Omit<PhysicianProfile, "authenticatedAt">): void {
    const fullProfile: PhysicianProfile = {
      ...profile,
      authenticatedAt: Date.now(),
    }
    this._profile = fullProfile
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fullProfile))
    } catch {
      // Non-fatal — profile is still in-memory
    }
    console.info(`[PhysicianSession] Authenticated: ${fullProfile.displayName} (${fullProfile.physicianId})`)
  }

  /**
   * Clears the physician session (logout).
   */
  clearSession(): void {
    this._profile = null
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {}
    console.info("[PhysicianSession] Session cleared")
  }
}

/** Global singleton — shared across the entire clinical runtime */
export const physicianSession = new PhysicianSessionManager()
