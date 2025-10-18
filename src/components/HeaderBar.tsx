import { useLocation } from 'react-router-dom'
import NotificationsBell from '@/components/NotificationsBell'
import { useAuth } from '@/contexts/AuthContext'

export function HeaderBar() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const hideOnPaths = ['/', '/admin-login']
  const hide = hideOnPaths.includes(location.pathname)

  if (!isAuthenticated || hide) return null

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      <NotificationsBell />
    </div>
  )
}