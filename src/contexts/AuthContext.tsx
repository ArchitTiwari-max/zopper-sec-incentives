import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthState, getAuth, setAuth, clearAuth, Role, SECAuthData, AdminAuthData } from '@/lib/auth'

interface AuthContextType {
  auth: AuthState | null
  login: (authData: AuthState) => void
  logout: () => void
  updateUser: (userData: SECAuthData | AdminAuthData) => void
  isAuthenticated: boolean
  isAdmin: boolean
  isSEC: boolean
  user: SECAuthData | AdminAuthData | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuthState] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedAuth = getAuth()
    if (storedAuth) {
      setAuthState(storedAuth)
    }
    setIsLoading(false)
  }, [])

  const login = (authData: AuthState) => {
    setAuth(authData)
    setAuthState(authData)
  }

  const logout = () => {
    clearAuth()
    setAuthState(null)
  }

  const updateUser = (userData: SECAuthData | AdminAuthData) => {
    if (auth) {
      const updatedAuth = {
        ...auth,
        user: userData
      }
      setAuth(updatedAuth)
      setAuthState(updatedAuth)
    }
  }

  const value: AuthContextType = {
    auth,
    login,
    logout,
    updateUser,
    isAuthenticated: !!auth,
    isAdmin: auth?.role === 'admin',
    isSEC: auth?.role === 'sec',
    user: auth?.user || null,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}