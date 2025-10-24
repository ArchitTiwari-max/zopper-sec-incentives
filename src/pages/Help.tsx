import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'
import { fetchStores, type Store } from '@/lib/api'
import { FaArrowLeft, FaGift, FaQuestionCircle, FaSpinner, FaStore } from 'react-icons/fa'
import { motion } from 'framer-motion'
import SearchableSelect from '@/components/SearchableSelect'

type HelpRequestType = 'voucher_issue' | 'general_assistance'

interface HelpRequest {
  id: string
  requestType: HelpRequestType
  description: string
  status: 'pending' | 'in_progress' | 'resolved'
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

export function HelpPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [requestType, setRequestType] = useState<HelpRequestType | ''>('')
  const [description, setDescription] = useState('')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [myRequests, setMyRequests] = useState<HelpRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    fetchMyRequests()
    // Load stores for optional selection
    const loadStores = async () => {
      const r = await fetchStores()
      if (r.success) setStores(r.data)
    }
    loadStores()
  }, [])

  const fetchMyRequests = async () => {
    if (!auth?.token) return
    
    setLoadingRequests(true)
    try {
const response = await authFetch(`${config.apiUrl}/help-requests`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    })
      const data = await response.json()
      if (data.success) {
        setMyRequests(data.data)
      }
    } catch (error) {
      console.error('Error fetching help requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requestType || !description.trim() || !storeId.trim()) {
      setShowToast({ type: 'error', message: 'Please fill in all fields including store selection' })
      setTimeout(() => setShowToast(null), 3000)
      return
    }

    if (!auth?.token) {
      setShowToast({ type: 'error', message: 'Authentication required' })
      setTimeout(() => setShowToast(null), 3000)
      return
    }

    setLoading(true)
    try {
const response = await authFetch(`${config.apiUrl}/help-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        requestType,
        description: description.trim(),
        storeId: storeId || undefined
      })
    })

      const data = await response.json()

      if (data.success) {
        setShowToast({ type: 'success', message: 'Our team will connect with you soon' })
        setTimeout(() => setShowToast(null), 4000)
        setRequestType('')
        setDescription('')
        setShowSuccessMessage(true)
        fetchMyRequests() // Refresh the list
      } else {
        setShowToast({ type: 'error', message: data.message || 'Failed to submit request' })
        setTimeout(() => setShowToast(null), 3000)
      }
    } catch (error) {
      setShowToast({ type: 'error', message: 'Network error. Please try again.' })
      setTimeout(() => setShowToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const getRequestTypeLabel = (type: HelpRequestType) => {
    switch (type) {
      case 'voucher_issue': return 'Voucher Issue'
      case 'general_assistance': return 'General Assistance'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'in_progress': return 'In Progress'
      case 'resolved': return 'Resolved'
      default: return status
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={() => navigate('/plan-sell-info')} 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <FaArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold">Help & Support</h2>
          <p className="text-xs text-gray-500">Need assistance? We're here to help!</p>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">How can we help you?</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setRequestType('voucher_issue')}
              className={`p-4 border-2 rounded-2xl transition-all flex items-center gap-3 ${
                requestType === 'voucher_issue'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FaGift className={requestType === 'voucher_issue' ? 'text-blue-500' : 'text-gray-400'} size={20} />
              <div className="text-left">
                <div className="font-medium text-sm">Unable to Use Voucher</div>
                <div className="text-xs text-gray-500">Issues with voucher redemption or usage</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRequestType('general_assistance')}
              className={`p-4 border-2 rounded-2xl transition-all flex items-center gap-3 ${
                requestType === 'general_assistance'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FaQuestionCircle className={requestType === 'general_assistance' ? 'text-blue-500' : 'text-gray-400'} size={20} />
              <div className="text-left">
                <div className="font-medium text-sm">General Assistance</div>
                <div className="text-xs text-gray-500">Other questions or concerns</div>
              </div>
            </button>
          </div>
        </div>

        {requestType && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Store *</label>
              <SearchableSelect
                value={storeId}
                onChange={(val) => setStoreId(val)}
                options={stores.map(s => ({ value: s.id, label: `${s.storeName} - ${s.city}` }))}
                placeholder="Search and select your store"
                leftIcon={<FaStore />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Please describe your issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-3 border rounded-2xl resize-none"
                placeholder="Provide details about your issue so we can help you better..."
                rows={5}
              />
            </div>

            <button
              type="submit"
              className="button-gradient w-full py-3 disabled:opacity-60 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" size={14} />
                  Submitting...
                </>
              ) : (
                'Submit Help Request'
              )}
            </button>
          </motion.div>
        )}
      </form>

      {/* My Requests Section */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-md font-semibold mb-3">My Help Requests</h3>
        
        {loadingRequests ? (
          <div className="text-center py-4 text-gray-500">
            <FaSpinner className="animate-spin inline-block" size={20} />
          </div>
        ) : myRequests.filter(r => r.status !== 'resolved').length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No pending help requests</p>
        ) : (
          <div className="space-y-3">
            {myRequests.filter(request => request.status !== 'resolved').map((request) => (
              <div key={request.id} className="p-4 border rounded-2xl bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">{getRequestTypeLabel(request.requestType)}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700">Description: </span>
                  <span className="text-xs text-gray-600">{request.description}</span>
                </div>
                {request.store && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-700">Store: </span>
                    <span className="text-xs text-gray-600">{request.store.storeName} - {request.store.city}</span>
                  </div>
                )}
                
                {request.adminNotes && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-1">Admin Response:</p>
                    <p className="text-xs text-gray-600">{request.adminNotes}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Submitted: {new Date(request.createdAt).toLocaleString()}
                </p>
                
                {/* Show success message for pending requests */}
                {request.status === 'pending' && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-800">Our team will connect with you soon</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center z-50">
          <div className={`${showToast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-4 py-2 rounded-full shadow-lg`}>
            {showToast.message}
          </div>
        </div>
      )}
    </motion.div>
  )
}
