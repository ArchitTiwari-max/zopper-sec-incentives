import { clearAuth } from '@/lib/auth'

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input as any, init as any)
  if (res.status === 401) {
    try {
      // Flag for UI to show session expired message on next load
      localStorage.setItem('auth:logout_reason', 'expired')
      localStorage.setItem('auth:logout_message', 'Your session has expired. Please sign in again.')
    } catch {}
    try { clearAuth() } catch {}
    try { window.location.assign('/') } catch {}
  }
  return res
}
