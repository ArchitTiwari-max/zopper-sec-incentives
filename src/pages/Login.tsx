import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaWhatsapp, FaPhone } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'

export function LoginPage() {
  const location = useLocation()
  const { login, isAuthenticated, isAdmin, isSEC } = useAuth()
  const [mode, setMode] = useState<'sec' | 'admin'>(() => (location.pathname === '/admin' ? 'admin' : 'sec'))

  // SEC state
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  // Admin state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) navigate('/admin/dashboard', { replace: true })
      else if (isSEC) navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isAdmin, isSEC, navigate])

  // SEC handlers
  const sendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      setToast({ message: 'Enter a valid 10-digit phone number', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await response.json()
      if (data.success) {
        setOtpSent(true)
        setToast({ message: 'OTP sent to your WhatsApp!', type: 'success' })
      } else {
        setToast({ message: data.message || 'Failed to send OTP', type: 'error' })
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const verifyOtp = async () => {
    if (otp.length < 4) {
      setToast({ message: 'Enter the complete OTP', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      })

      const data = await response.json()
      if (data.success) {
        const authData = {
          token: data.token,
          role: 'sec' as const,
          user: data.user
        }
        login(authData)
        setToast({ message: 'Login successful!', type: 'success' })
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000)
      } else {
        setToast({ message: data.message || 'Invalid OTP', type: 'error' })
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  // Admin handler
  const adminLogin = async () => {
    if (!username || !password) {
      setToast({ message: 'Enter username and password', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()
      if (data.success) {
        const authData = {
          token: data.token,
          role: 'admin' as const,
          user: data.user
        }
        login(authData)
        setToast({ message: 'Login successful!', type: 'success' })
        setTimeout(() => navigate('/admin/dashboard', { replace: true }), 1000)
      } else {
        setToast({ message: data.message || 'Invalid credentials', type: 'error' })
      }
    } catch (error) {
      console.error('Error in admin login:', error)
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h1 className="text-xl font-semibold text-center">Spot Incentive Portal</h1>

      {/* Toggle */}
      <div className="mt-4 grid grid-cols-2 p-1 rounded-2xl border bg-gray-50">
        <button
          onClick={() => setMode('sec')}
          className={`py-2 rounded-2xl text-sm ${mode === 'sec' ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
        >SEC Login</button>
        <button
          onClick={() => setMode('admin')}
          className={`py-2 rounded-2xl text-sm ${mode === 'admin' ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
        >Admin Login</button>
      </div>

      {/* Forms */}
      {mode === 'sec' ? (
        <div className="mt-6 space-y-3">
          <label className="block text-sm font-medium">Phone Number</label>
          <div className="relative">
            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter 10-digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          {!otpSent ? (
            <button onClick={sendOtp} disabled={loading} className="button-gradient w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60">
              <FaWhatsapp className="text-green-500 bg-white rounded-full" />
              {loading ? 'Sending…' : 'Send OTP on WhatsApp'}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full px-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none tracking-widest text-center"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
              />
              <button onClick={verifyOtp} disabled={loading} className="button-gradient w-full py-3 disabled:opacity-60">{loading ? 'Verifying…' : 'Verify & Continue'}</button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); adminLogin(); }} className="mt-6 space-y-3">
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
        </form>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center z-50">
          <div className={`px-4 py-2 rounded-full shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </motion.div>
  )
}
