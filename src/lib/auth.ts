export type Role = 'admin' | 'sec'

const STORAGE_KEY = 'spot_incentive_auth'

export interface AuthState {
  token: string
  role: Role
  phone: string
  secId?: string
}

export function setAuth(auth: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  localStorage.setItem('token', auth.token)
}

export function getAuth(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthState
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('token')
}
