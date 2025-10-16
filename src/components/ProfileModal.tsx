import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaUser, FaIdBadge, FaSpinner } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { SECAuthData } from '@/lib/auth'
import { config } from '@/lib/config'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onProfileUpdated: (updatedUser: SECAuthData) => void
}

export function ProfileModal({ isOpen, onClose, onProfileUpdated }: ProfileModalProps) {
  const { auth } = useAuth()
  const [formData, setFormData] = useState({
    secId: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.secId.trim()) {
      setToast({ message: 'SEC ID is required', type: 'error' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth?.token}`
        },
        body: JSON.stringify({
          secId: formData.secId.trim(),
          name: formData.name.trim() || null
        })
      })

      const data = await response.json()
      if (data.success) {
        setToast({ message: 'Profile updated successfully!', type: 'success' })
        setTimeout(() => {
          setToast(null)
          onProfileUpdated(data.user)
          onClose()
        }, 1500)
      } else {
        setToast({ message: data.message || 'Failed to update profile', type: 'error' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Complete Your Profile</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">SEC ID *</label>
                <div className="relative">
                  <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.secId}
                    onChange={(e) => setFormData(prev => ({ ...prev, secId: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter your SEC ID"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Name (Optional)</label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 button-gradient px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" size={14} />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>

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
        </div>
      )}
    </AnimatePresence>
  )
}