export type Role = 'admin' | 'sec'

const STORAGE_KEY = 'spot_incentive_auth'

export interface SECAuthData {
  secId: string
  phone: string
  name?: string
  storeId?: string
}

export interface AdminAuthData {
  adminId: string
  username: string
  name: string
  email?: string
}

export interface AuthState {
  token: string
  role: Role
  user: SECAuthData | AdminAuthData
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

// Type guards
export function isSECUser(user: SECAuthData | AdminAuthData): user is SECAuthData {
  return 'phone' in user
}

export function isAdminUser(user: SECAuthData | AdminAuthData): user is AdminAuthData {
  return 'username' in user
}
