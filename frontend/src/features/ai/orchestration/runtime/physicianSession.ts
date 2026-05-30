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

import { cryptoHelper } from "../../services/persistence/crypto"

/**
 * Sentinel ID for sessions without a real authenticated physician.
 *
 * MUST stay byte-for-byte identical to FALLBACK_PHYSICIAN_ID in
 * src/services/approval_store.py — the backend uses it to reject any
 * resolve attempt that arrives with this ID (defense in depth, Fix #2).
 */
export const FALLBACK_PHYSICIAN_ID = "PHYSICIAN_NOT_AUTHENTICATED"

export class UnauthenticatedPhysicianError extends Error {
  constructor(action: string) {
    super(
      `Unauthenticated physician cannot perform clinical action: ${action}. ` +
        `Sign in with a valid CRM/NPI before approving plans.`
    )
    this.name = "UnauthenticatedPhysicianError"
  }
}

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
  /**
   * Whether this profile represents a real authenticated physician.
   * Always false for FALLBACK_PHYSICIAN; true after authenticate() succeeds.
   */
  isAuthenticated: boolean
  /** Session token hash — opaque, not the raw token */
  sessionTokenHash?: string
  /** Raw session token to derive DB encryption key from */
  sessionToken?: string
}

const SESSION_STORAGE_KEY = "aether:physician_session"
const FALLBACK_PHYSICIAN: PhysicianProfile = {
  physicianId: FALLBACK_PHYSICIAN_ID,
  displayName: "Physician (Demo Mode)",
  specialty: "Oncology",
  crm: undefined,
  authenticatedAt: Date.now(),
  isAuthenticated: false,
  sessionToken: "demo-session-token-hash-fallback"
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
          // Older sessions persisted without isAuthenticated; coerce here so
          // upgrade paths don't silently treat them as unauthenticated.
          if (typeof parsed.isAuthenticated !== "boolean") {
            parsed.isAuthenticated = parsed.physicianId !== FALLBACK_PHYSICIAN_ID
          }
          this._profile = parsed
          if (parsed.sessionToken) {
            cryptoHelper.setSessionToken(parsed.sessionToken).catch(err => {
              console.error("Failed to pre-derive key from restored session token", err)
            })
          }
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
    return this.getProfile().isAuthenticated
  }

  /**
   * Strict accessor for clinical-action call-sites.
   *
   * Throws UnauthenticatedPhysicianError instead of silently returning the
   * fallback profile. Every code path that records a physician decision
   * (approve, reject, override) MUST use this — never getProfile() directly.
   */
  requireAuthenticatedPhysician(action: string): PhysicianProfile {
    const profile = this.getProfile()
    if (!profile.isAuthenticated || profile.physicianId === FALLBACK_PHYSICIAN_ID) {
      console.error(
        "[PhysicianSession] Unauthenticated clinical action attempt:",
        action
      )
      throw new UnauthenticatedPhysicianError(action)
    }
    return profile
  }

  /**
   * Authenticates a physician for this session.
   * In production: called after hospital SSO callback with validated claims.
   */
  authenticate(profile: Omit<PhysicianProfile, "authenticatedAt" | "isAuthenticated">): void {
    if (profile.physicianId === FALLBACK_PHYSICIAN_ID) {
      throw new UnauthenticatedPhysicianError(
        `authenticate(${FALLBACK_PHYSICIAN_ID})`
      )
    }
    const fullProfile: PhysicianProfile = {
      ...profile,
      authenticatedAt: Date.now(),
      isAuthenticated: true,
    }
    this._profile = fullProfile
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fullProfile))
    } catch {
      // Non-fatal — profile is still in-memory
    }
    if (fullProfile.sessionToken) {
      cryptoHelper.setSessionToken(fullProfile.sessionToken).catch(err => {
        console.error("Failed to pre-derive key from authenticated session token", err)
      })
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
    cryptoHelper.clearKey()
    console.info("[PhysicianSession] Session cleared")
  }
}

/** Global singleton — shared across the entire clinical runtime */
export const physicianSession = new PhysicianSessionManager()
