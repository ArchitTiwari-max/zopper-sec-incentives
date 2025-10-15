import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaWhatsapp, FaPhone } from 'react-icons/fa'
import { setAuth, getAuth } from '@/lib/auth'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAuth()
    if (auth?.role === 'admin') navigate('/admin/dashboard', { replace: true })
    else if (auth?.role === 'sec') navigate('/dashboard', { replace: true })
  }, [navigate])

  const sendOtp = () => {
    if (!/^\d{10}$/.test(phone)) return alert('Enter a valid 10-digit phone number')
    setLoading(true)
    setTimeout(() => {
      setOtpSent(true)
      setLoading(false)
      setToast('OTP sent on WhatsApp')
      setTimeout(() => setToast(null), 1500)
    }, 600)
  }

  const verifyOtp = () => {
    if (otp.length < 4) return alert('Enter the OTP')
    setLoading(true)
    setTimeout(() => {
      const role = phone === '9999999999' ? 'admin' : 'sec'
      const token = `mock-jwt-${Date.now()}`
      setAuth({ token, role, phone, secId: role === 'sec' ? 'SEC12345' : undefined })
      setLoading(false)
      setToast('Logged in successfully')
      setTimeout(() => {
        setToast(null)
        navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
      }, 600)
    }, 600)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h1 className="text-xl font-semibold text-center">Welcome to Spot Incentive Portal</h1>
      <p className="text-sm text-gray-500 text-center mt-1">Login using your registered phone number</p>

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

      {toast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full shadow">✅ {toast}</div>
        </div>
      )}
    </motion.div>
  )
}
