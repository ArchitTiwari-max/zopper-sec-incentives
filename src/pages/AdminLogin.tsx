import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'

export function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionMessage, setSessionMessage] = useState<string>('Your session has expired. Please sign in again.')
  const navigate = useNavigate()
  const { login, isAdmin } = useAuth()

  useEffect(() => {
    if (isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [navigate, isAdmin])

  // Show session expired popup if set by authFetch
  useEffect(() => {
    const msg = localStorage.getItem('auth:logout_message')
    if (msg) {
      setSessionMessage(msg)
      setSessionModalOpen(true)
      localStorage.removeItem('auth:logout_message')
      localStorage.removeItem('auth:logout_reason')
    }
  }, [])

  const handleLogin = async () => {
    if (!username || !password) {
      setToast('Enter username and password')
      setTimeout(() => setToast(null), 3000)
      return
    }

    setLoading(true)
    setToast(null)

    try {
      const response = await fetch(`${config.apiUrl}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.success && data.token) {
        login({
          token: data.token,
          role: 'admin',
          user: data.user
        })
        navigate('/admin/dashboard', { replace: true })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setToast(error instanceof Error ? error.message : 'Login failed')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h1 className="text-xl font-semibold text-center">Admin Login</h1>
      <p className="text-sm text-gray-500 text-center mt-1">Use your admin credentials</p>

      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm font-medium">Username</label>
          <input
            name="username"
            autoComplete="username"
            className="w-full px-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full px-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} className="button-gradient w-full py-3 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign In'}</button>
        <div className="text-center text-sm text-gray-500 space-y-2">
          <div>Not an admin? <Link to="/" className="underline">Login with phone</Link></div>
          <div>Need an account? <Link to="/signup" className="underline">Sign up for different roles</Link></div>
        </div>
      </form>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full shadow">⚠️ {toast}</div>
        </div>
      )}

      {sessionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="text-lg font-semibold mb-2">Session expired</div>
            <div className="text-sm text-gray-600 mb-5">{sessionMessage}</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSessionModalOpen(false)} className="px-4 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-700">OK</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}