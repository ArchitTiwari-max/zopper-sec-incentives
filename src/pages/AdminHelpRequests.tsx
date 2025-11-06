import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'
import { FaArrowLeft, FaGift, FaQuestionCircle, FaSpinner, FaFilter } from 'react-icons/fa'
import { motion } from 'framer-motion'

type HelpRequestType = 'voucher_issue' | 'general_assistance'
type HelpRequestStatus = 'pending' | 'in_progress' | 'resolved'

interface HelpRequest {
  id: string
  secUserId: string
  secPhone: string
  secName?: string
  storeId?: string
  store?: { storeName: string; city: string }
  requestType: HelpRequestType
  description: string
  status: HelpRequestStatus
  adminNotes?: string
  resolvedBy?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export function AdminHelpRequests() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<HelpRequestStatus | 'all'>('all')
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalStatus, setModalStatus] = useState<HelpRequestStatus>('pending')
  const [modalNotes, setModalNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [filterStatus])

  const fetchRequests = async () => {
    if (!auth?.token) return

    setLoading(true)
    try {
      const url = filterStatus === 'all' 
        ? `${config.apiUrl}/admin/help-requests`
        : `${config.apiUrl}/admin/help-requests?status=${filterStatus}`
      
const response = await authFetch(url, {
      headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setRequests(data.data)
      }
    } catch (error) {
      console.error('Error fetching help requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (request: HelpRequest) => {
    setSelectedRequest(request)
    setModalStatus(request.status)
    setModalNotes(request.adminNotes || '')
    setShowModal(true)
  }

  const handleUpdateRequest = async () => {
    if (!selectedRequest || !auth?.token) return

    setUpdating(true)
    try {
const response = await authFetch(`${config.apiUrl}/admin/help-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          status: modalStatus,
          adminNotes: modalNotes.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowToast({ type: 'success', message: 'Help request updated successfully' })
        setTimeout(() => setShowToast(null), 3000)
        setShowModal(false)
        fetchRequests() // Refresh the list
      } else {
        setShowToast({ type: 'error', message: data.message || 'Failed to update request' })
        setTimeout(() => setShowToast(null), 3000)
      }
    } catch (error) {
      setShowToast({ type: 'error', message: 'Network error. Please try again.' })
      setTimeout(() => setShowToast(null), 3000)
    } finally {
      setUpdating(false)
    }
  }

  const getRequestTypeLabel = (type: HelpRequestType) => {
    switch (type) {
      case 'voucher_issue': return 'Voucher Issue'
      case 'general_assistance': return 'General Assistance'
      default: return type
    }
  }

  const getRequestTypeIcon = (type: HelpRequestType) => {
    switch (type) {
      case 'voucher_issue': return <FaGift />
      case 'general_assistance': return <FaQuestionCircle />
      default: return <FaQuestionCircle />
    }
  }

  const getStatusColor = (status: HelpRequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: HelpRequestStatus) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'in_progress': return 'In Progress'
      case 'resolved': return 'Resolved'
      default: return status
    }
  }

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Admin Dashboard"
        >
          <FaArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Help Requests</h2>
          <p className="text-xs text-gray-500">Manage SEC support requests</p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['all', 'pending', 'in_progress', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : getStatusLabel(status)} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <FaSpinner className="animate-spin inline-block mb-2" size={24} />
          <p className="text-sm">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaFilter className="inline-block mb-2" size={24} />
          <p className="text-sm">No help requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenModal(request)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">{getRequestTypeIcon(request.requestType)}</span>
                  <div>
                    <div className="font-medium text-sm">{getRequestTypeLabel(request.requestType)}</div>
                    <div className="text-xs text-gray-500">
                      {request.secName || 'Unknown'} • {request.secPhone} • {request.store?.storeName || '—'}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                  {getStatusLabel(request.status)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{request.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Submitted: {new Date(request.createdAt).toLocaleString()}</span>
                {request.resolvedAt && (
                  <span className="text-green-600">Resolved: {new Date(request.resolvedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Help Request Details</h3>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">SEC Name:</span>
                    <div className="font-medium">{selectedRequest.secName || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium">{selectedRequest.secPhone}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Request Type:</span>
                    <div className="font-medium">{getRequestTypeLabel(selectedRequest.requestType)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Store:</span>
                    <div className="font-medium">{selectedRequest.store?.storeName || '—'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                    <div className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.description}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as HelpRequestStatus)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notes</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  placeholder="Add notes or response for the SEC..."
                  rows={4}
                />
              </div>

              {selectedRequest.resolvedBy && (
                <div className="p-3 bg-green-50 rounded-lg text-sm">
                  <span className="text-gray-600">Resolved by:</span> <span className="font-medium">{selectedRequest.resolvedBy}</span>
                  {selectedRequest.resolvedAt && (
                    <span className="text-gray-600 ml-2">
                      on {new Date(selectedRequest.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRequest}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={updating}
              >
                {updating ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Updating...
                  </>
                ) : (
                  'Update Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
