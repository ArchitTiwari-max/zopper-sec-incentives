import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaUser, FaPhone, FaUserTag, FaLock, FaStore } from 'react-icons/fa'
import { config } from '@/lib/config'
import { ZopperLogo } from '@/components/ZopperLogo'
import MultiSelect from '@/components/MultiSelect'

interface Store {
  id: string
  storeName: string
  city: string
}

export function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    username: '',
    password: '',
    storeIds: [] as string[]
  })
  
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const navigate = useNavigate()

  const roles = [
    { value: 'ASE1', label: 'ASE1' },
    { value: 'ASE2', label: 'ASE2' },
    { value: 'ABM', label: 'ABM' },
    { value: 'ZSE', label: 'ZSE' },
    { value: 'ZSM', label: 'ZSM' }
  ]

  const rolesWithStores = ['ASE1', 'ASE2', 'ABM']
  const showStoreSelection = rolesWithStores.includes(formData.role)

  // Fetch stores when component mounts
  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      console.log('Fetching stores from:', `${config.apiUrl}/stores`)
      const response = await fetch(`${config.apiUrl}/stores`)
      const data = await response.json()
      console.log('Stores response:', data)
      if (data.success) {
        setStores(data.data)
        console.log('Stores loaded:', data.data.length)
      } else {
        console.error('Failed to fetch stores:', data.message)
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStoreSelection = (storeIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      storeIds: storeIds
    }))
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      setToast({ message: 'Name is required', type: 'error' })
      return
    }
    
    if (!/^\d{10}$/.test(formData.phone)) {
      setToast({ message: 'Enter a valid 10-digit phone number', type: 'error' })
      return
    }
    
    if (!formData.role) {
      setToast({ message: 'Please select a role', type: 'error' })
      return
    }
    
    if (!formData.username.trim()) {
      setToast({ message: 'Username is required', type: 'error' })
      return
    }
    
    if (formData.password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' })
      return
    }
    
    if (showStoreSelection && formData.storeIds.length === 0) {
      setToast({ message: 'Please select at least one store', type: 'error' })
      return
    }

    setLoading(true)
    
    try {
      // Prepare data for API - convert storeIds array to storeId for backend compatibility
      const submitData = {
        ...formData,
        storeId: formData.storeIds.length > 0 ? formData.storeIds[0] : '', // Send first store for now
        storeIds: formData.storeIds // Also send array in case backend supports it
      }
      
      const response = await fetch(`${config.apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const data = await response.json()
      
      if (data.success) {
        setToast({ message: 'Account created successfully! You can now login.', type: 'success' })
        setTimeout(() => {
          navigate('/')
        }, 2000)
      } else {
        setToast({ message: data.message || 'Failed to create account', type: 'error' })
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-center flex-1">Create Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="name"
              className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <div className="relative">
            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none scale-x-[-1]" />
            <input
              type="text"
              name="phone"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter 10-digit number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
              disabled={loading}
            />
          </div>
        </div>

        {/* Role Field */}
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <div className="relative">
            <FaUserTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              name="role"
              className="w-full pl-10 pr-8 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={formData.role}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Store Selection - Only show for ASE1, ASE2, ABM */}
        {showStoreSelection && (
          <div>
            <label className="block text-sm font-medium mb-1">Select Stores</label>
            <MultiSelect
              values={formData.storeIds}
              onChange={handleStoreSelection}
              options={stores.map(s => ({ value: s.id, label: `${s.storeName} - ${s.city}` }))}
              placeholder="Search or select stores"
              leftIcon={<FaStore />}
              disabled={loading}
            />
          </div>
        )}

        {/* Username Field */}
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="username"
              className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="password"
              name="password"
              className="w-full pl-10 pr-3 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter password (min 6 characters)"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="button-gradient w-full py-3 disabled:opacity-60"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="text-center text-sm text-gray-500">
          Already have an account? <Link to="/" className="underline">Login here</Link>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500 whitespace-nowrap">
          <span>Powered by</span>
          <ZopperLogo className="align-middle" />
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
  )
}