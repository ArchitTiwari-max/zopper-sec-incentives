import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Role } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: Role[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { isAuthenticated, auth } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Preserve the current location including query params as a return target
    const currentPath = location.pathname + location.search + location.hash
    const loginPath = `${redirectTo}?returnTo=${encodeURIComponent(currentPath)}`

    return <Navigate 
      to={loginPath} 
      state={{ from: location }} 
      replace 
    />
  }

  if (allowedRoles && auth && !allowedRoles.includes(auth.role)) {
    // Redirect based on user role
    const defaultRedirect = auth.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    return <Navigate 
      to={defaultRedirect} 
      replace 
    />
  }

  return <>{children}</>
}

// Specific route guards for convenience
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  )
}

export function SECRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['sec']}>
      {children}
    </ProtectedRoute>
  )
}

// Public route that redirects authenticated users
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isSEC } = useAuth()
  const location = useLocation()

  if (isAuthenticated) {
    // Check for returnTo in query params first (more robust)
    const params = new URLSearchParams(location.search)
    const returnTo = params.get('returnTo')
    
    if (returnTo) {
      return <Navigate to={decodeURIComponent(returnTo)} replace />
    }

    const from = (location.state as any)?.from
    if (from && typeof from === 'object') {
      const next = `${from.pathname || ''}${from.search || ''}${from.hash || ''}` || '/'
      return <Navigate to={next} replace />
    }
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />
    if (isSEC) return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}
