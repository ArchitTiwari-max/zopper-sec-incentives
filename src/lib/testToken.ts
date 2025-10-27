import { config } from '@/lib/config'

export interface TestSession {
  phone: string
  token: string
  startTime: string
  isActive: boolean
}

/**
 * Extract phone from URL parameters (fallback to secId for backward compatibility)
 */
export function extractPhoneFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const phone = params.get('phone')
  if (phone) return phone
  const legacySecId = params.get('secId')
  return legacySecId
}

export function extractSigParams() {
  const params = new URLSearchParams(window.location.search)
  const sig = params.get('sig')
  const ts = params.get('ts')
  const token = params.get('token')
  return { sig, ts: ts ? Number(ts) : null, token }
}

/**
 * Validate test token: prefer JWT token; else verify HMAC sig; else fallback to phone format check
 */
export async function validateTestToken(phone: string): Promise<boolean> {
  if (!phone) return false

  const { sig, ts, token } = extractSigParams()
  try {
    if (token) {
      const resp = await fetch(`${config.apiUrl}/tests/verify?token=${encodeURIComponent(token)}`)
      const j = await resp.json()
      return !!j.valid
    }
    if (sig && ts) {
      const resp = await fetch(`${config.apiUrl}/tests/verify?phone=${encodeURIComponent(phone)}&ts=${ts}&sig=${encodeURIComponent(sig)}`)
      const j = await resp.json()
      return !!j.valid
    }
  } catch {
    return false
  }
  
  // Basic phone validation - 10 digits (optionally prefixed with 91)
  const clean = phone.startsWith('91') ? phone.slice(2) : phone
  return /^\d{10}$/.test(clean)
}

/**
 * Create test session for tracking
 */
export function createTestSession(phone: string): TestSession {
  return {
    phone,
    token: generateSessionToken(),
    startTime: new Date().toISOString(),
    isActive: true
  }
}

/**
 * Generate a simple session token for tracking
 */
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Save test session to localStorage
 */
export function saveTestSession(session: TestSession): void {
  localStorage.setItem('test_session', JSON.stringify(session))
}

/**
 * Get active test session
 */
export function getTestSession(): TestSession | null {
  const saved = localStorage.getItem('test_session')
  if (!saved) return null
  
  try {
    const session = JSON.parse(saved) as TestSession
    return session.isActive ? session : null
  } catch {
    return null
  }
}

/**
 * End test session
 */
export function endTestSession(): void {
  const session = getTestSession()
  if (session) {
    session.isActive = false
    localStorage.setItem('test_session', JSON.stringify(session))
  }
}
