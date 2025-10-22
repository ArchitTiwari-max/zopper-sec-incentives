import { config } from '@/lib/config'

export interface TestSession {
  secId: string
  token: string
  startTime: string
  isActive: boolean
}

/**
 * Extract secId from URL parameters
 */
export function extractSecIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('secId')
}

export function extractSigParams() {
  const params = new URLSearchParams(window.location.search)
  const sig = params.get('sig')
  const ts = params.get('ts')
  return { sig, ts: ts ? Number(ts) : null }
}

/**
 * Validate test token: if signature present, verify with backend; else fallback to format check
 */
export async function validateTestToken(secId: string): Promise<boolean> {
  if (!secId || secId.length < 3) return false

  const { sig, ts } = extractSigParams()
  if (sig && ts) {
    try {
      const resp = await fetch(`${config.apiUrl}/tests/verify?secId=${encodeURIComponent(secId)}&ts=${ts}&sig=${encodeURIComponent(sig)}`)
      const j = await resp.json()
      return !!j.valid
    } catch {
      return false
    }
  }
  
  // Basic format validation - alphanumeric, 3+ chars
  const tokenPattern = /^[A-Za-z0-9]+$/
  return tokenPattern.test(secId)
}

/**
 * Create test session for tracking
 */
export function createTestSession(secId: string): TestSession {
  return {
    secId,
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