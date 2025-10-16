import { useEffect, useMemo, useState } from 'react'
import CameraScanner from '@/components/CameraScanner'
import { ProfileModal } from '@/components/ProfileModal'
import { motion } from 'framer-motion'
import { FaBarcode, FaStore, FaMobileAlt, FaListAlt, FaRupeeSign, FaIdBadge, FaSpinner, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isSECUser, SECAuthData } from '@/lib/auth'
import { 
  fetchStores, 
  fetchSamsungSKUs, 
  fetchPlansForSKU, 
  fetchPlanPrice,
  formatPlanType,
  formatPrice,
  type Store, 
  type SamsungSKU, 
  type Plan 
} from '@/lib/api'
import { config } from '@/lib/config'

export function SecDashboard() {
  const { auth, logout, user, updateUser } = useAuth()
  const navigate = useNavigate()
  
  const secUser = user && isSECUser(user) ? user : null
  const secId = secUser?.secId || null
  const displayName = secUser?.name || `User (${secUser?.phone})`
  const [store, setStore] = useState('')
  const [device, setDevice] = useState('')
  const [planType, setPlanType] = useState('')
  const [planPrice, setPlanPrice] = useState(0)
  const [imei, setImei] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }
  
  const handleProfileUpdated = (updatedUser: SECAuthData) => {
    // Update the auth context with new user data
    updateUser(updatedUser)
  }
  
  // State for API data
  const [stores, setStores] = useState<Store[]>([])
  const [samsungSKUs, setSamsungSKUs] = useState<SamsungSKU[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState({
    stores: false,
    skus: false,
    plans: false,
    price: false,
    submit: false
  })

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      setLoading(prev => ({ ...prev, stores: true }))
      const response = await fetchStores()
      if (response.success) {
        setStores(response.data)
      } else {
        console.error('Failed to load stores:', response.error)
      }
      setLoading(prev => ({ ...prev, stores: false }))
    }
    loadStores()
  }, [])
  
  // Load Samsung SKUs on component mount
  useEffect(() => {
    const loadSKUs = async () => {
      setLoading(prev => ({ ...prev, skus: true }))
      const response = await fetchSamsungSKUs()
      if (response.success) {
        setSamsungSKUs(response.data)
      } else {
        console.error('Failed to load Samsung SKUs:', response.error)
      }
      setLoading(prev => ({ ...prev, skus: false }))
    }
    loadSKUs()
  }, [])
  
  // Load plans when device changes
  useEffect(() => {
    if (device) {
      const loadPlans = async () => {
        setLoading(prev => ({ ...prev, plans: true }))
        const response = await fetchPlansForSKU(device)
        if (response.success) {
          setAvailablePlans(response.data)
        } else {
          console.error('Failed to load plans:', response.error)
          setAvailablePlans([])
        }
        setLoading(prev => ({ ...prev, plans: false }))
      }
      loadPlans()
    } else {
      setAvailablePlans([])
    }
    // Reset plan selection when device changes
    setPlanType('')
    setPlanPrice(0)
  }, [device])
  
  // Load plan price when both device and plan type are selected
  useEffect(() => {
    if (device && planType) {
      const loadPlanPrice = async () => {
        setLoading(prev => ({ ...prev, price: true }))
        const response = await fetchPlanPrice(device, planType)
        if (response.success) {
          setPlanPrice(response.data.price)
        } else {
          console.error('Failed to load plan price:', response.error)
          setPlanPrice(0)
        }
        setLoading(prev => ({ ...prev, price: false }))
      }
      loadPlanPrice()
    } else {
      setPlanPrice(0)
    }
  }, [device, planType])
  
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!store || !device || !planType || !imei) {
      alert('Please fill in all fields')
      return
    }
    
    if (!auth?.token) {
      alert('Authentication required')
      return
    }
    
    setLoading(prev => ({ ...prev, submit: true }))
    
    try {
      const response = await fetch(`${config.apiUrl}/reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          storeId: store,
          samsungSKUId: device,
          planId: availablePlans.find(p => p.planType === planType)?.id,
          imei: imei.trim()
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Reset form
        setStore('')
        setDevice('')
        setPlanType('')
        setPlanPrice(0)
        setImei('')
        
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
        
        // Show incentive earned
        if (data.data.incentiveEarned > 0) {
          alert(`Report submitted successfully! You earned ₹${data.data.incentiveEarned} incentive.`)
        }
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Network error. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, submit: false }))
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-lg font-semibold">SEC Dashboard</h2>
          <p className="text-xs text-gray-500">Submit your plan sales below or view your reports.</p>
          {!secId && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors w-full text-left"
            >
              <p className="text-xs text-yellow-700">
                ⚠️ Please complete your profile by setting your SEC ID
                <span className="ml-1 underline">Click here</span>
              </p>
            </button>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <FaSignOutAlt size={12} />
          Logout
        </button>
      </div>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1">SEC ID</label>
          <div className="relative">
            <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              readOnly 
              value={secId || ''} 
              placeholder={secId ? '' : 'SEC ID not set - complete profile'}
              className={`w-full pl-10 pr-3 py-3 border rounded-2xl ${
                secId ? 'bg-gray-100' : 'bg-yellow-50 border-yellow-300'
              }`} 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Store Name</label>
          <div className="relative">
            <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {loading.stores && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            <select 
              value={store} 
              onChange={(e) => setStore(e.target.value)} 
              className="w-full pl-10 pr-10 py-3 border rounded-2xl"
              disabled={loading.stores}
            >
              <option value="" disabled>
                {loading.stores ? 'Loading stores...' : 'Select store'}
              </option>
              {stores.map((storeItem) => (
                <option key={storeItem.id} value={storeItem.id}>
                  {storeItem.storeName} - {storeItem.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Device Name</label>
          <div className="relative">
            <FaMobileAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {loading.skus && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            <select 
              value={device} 
              onChange={(e) => setDevice(e.target.value)} 
              className="w-full pl-10 pr-10 py-3 border rounded-2xl"
              disabled={loading.skus}
            >
              <option value="" disabled>
                {loading.skus ? 'Loading devices...' : 'Select device'}
              </option>
              {samsungSKUs.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.Category} - {sku.ModelName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Type</label>
          <div className="relative">
            <FaListAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {loading.plans && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            <select 
              value={planType} 
              onChange={(e) => setPlanType(e.target.value)} 
              className="w-full pl-10 pr-10 py-3 border rounded-2xl"
              disabled={loading.plans || !device}
            >
              <option value="" disabled>
                {!device ? 'Select device first' : loading.plans ? 'Loading plans...' : 'Select plan'}
              </option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.planType}>
                  {formatPlanType(plan.planType)} - {formatPrice(plan.price)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Price</label>
          <div className="relative">
            <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {loading.price && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            <input 
              readOnly 
              value={loading.price ? 'Loading price...' : planPrice ? formatPrice(planPrice) : ''} 
              className="w-full pl-10 pr-10 py-3 border rounded-2xl bg-gray-100" 
              placeholder="Select device and plan to see price"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">IMEI Number</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full px-3 py-3 border rounded-2xl"
                placeholder="Scan or enter IMEI"
              />
            </div>
            <button type="button" onClick={() => setScanning((s) => !s)} className="button-gradient px-4 flex items-center gap-2">
              <FaBarcode /> Scan
            </button>
          </div>
          {scanning && (
            <CameraScanner
              onDetected={(value, parsed) => {
                const imei = parsed ?? value
                if (imei) setImei(imei)
                setScanning(false)
              }}
              onClose={() => setScanning(false)}
            />
          )}
        </div>

        <p className="text-xs italic text-gray-500">Any incorrect sales reported will impact your future incentives.</p>

        <button 
          type="submit" 
          className="button-gradient w-full py-3 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading.submit}
        >
          {loading.submit ? (
            <>
              <FaSpinner className="animate-spin" size={14} />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </button>
      </form>

      <button onClick={() => navigate('/report')} className="button-gradient w-full py-3 mt-3">Open Reports</button>

      {showToast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full shadow">✅ Report submitted successfully</div>
        </div>
      )}
      
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </motion.div>
  )
}
