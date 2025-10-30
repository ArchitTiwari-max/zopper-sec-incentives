import { useEffect, useMemo, useState } from 'react'
import { FaBell, FaCheck, FaSpinner } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { formatPlanType } from '@/lib/api'
import { authFetch } from '@/lib/http'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  readAt?: string | null
}

interface DeductionItem {
  id: string
  imei: string
  deductionAmount: number
  reason: string
  processedAt?: string
  createdAt?: string
  updatedAt?: string
  salesReport?: {
    plan?: { planType?: string }
  }
}

function formatDateDMY(dateStr: string) {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export default function CombinedNotificationsBell() {
  const { auth } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [deductions, setDeductions] = useState<DeductionItem[]>([])
  const [loading, setLoading] = useState({ notifs: false, deds: false })

  // LocalStorage key for last-seen time of deductions (they don't have read flags)
  const lastSeenKey = auth?.role === 'sec' && auth.user && 'phone' in auth.user
    ? `deductions:lastSeen:sec:${(auth.user as any).phone}`
    : 'deductions:lastSeen'

  const getLastSeen = () => {
    const v = localStorage.getItem(lastSeenKey)
    return v ? new Date(v) : null
  }
  const setLastSeen = (d: Date) => localStorage.setItem(lastSeenKey, d.toISOString())

  const unreadCount = useMemo(() => {
    const unreadNotifs = notifications.filter(n => !n.readAt).length
    const lastSeen = getLastSeen()
    const unreadDeds = deductions.filter(i => new Date(i.processedAt || i.createdAt || i.updatedAt || 0) > (lastSeen || new Date(0))).length
    return unreadNotifs + unreadDeds
  }, [notifications, deductions])

  const fetchNotifications = async () => {
    if (!auth?.token) return
    setLoading(prev => ({ ...prev, notifs: true }))
    try {
      const res = await authFetch(`${config.apiUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      const json = await res.json()
      if (json.success) setNotifications(json.data as NotificationItem[])
    } finally {
      setLoading(prev => ({ ...prev, notifs: false }))
    }
  }

  const fetchDeductions = async () => {
    if (!auth?.token) return
    setLoading(prev => ({ ...prev, deds: true }))
    try {
      const res = await authFetch(`${config.apiUrl}/sec/deductions`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      const json = await res.json()
      if (json.success) setDeductions(json.data as DeductionItem[])
    } finally {
      setLoading(prev => ({ ...prev, deds: false }))
    }
  }

  const refreshAll = () => {
    fetchNotifications()
    fetchDeductions()
  }

  useEffect(() => {
    refreshAll()
    const id = setInterval(refreshAll, 60000)
    return () => clearInterval(id)
  }, [auth?.token])

  const markAllRead = async () => {
    if (!auth?.token) return
    try {
      await authFetch(`${config.apiUrl}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      setNotifications(prev => prev.map(i => ({ ...i, readAt: new Date().toISOString() })))
      setLastSeen(new Date())
      setOpen(false)
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
  }

  const isLoading = loading.notifs || loading.deds

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 rounded-lg">
        <FaBell />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold text-sm">Notifications</div>
            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <FaCheck size={10} /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-600 flex items-center gap-2"><FaSpinner className="animate-spin" /> Loading...</div>
            ) : notifications.length === 0 && deductions.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              <>
                {/* General notifications */}
                {notifications.map(item => (
                  <div key={item.id} className={`p-3 border-b ${!item.readAt ? 'bg-blue-50/40' : ''}`}>
                    <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-sm text-gray-700">{item.message}</div>
                  </div>
                ))}

                {/* Deductions */}
                {deductions.map(item => {
                  const when = item.processedAt || item.createdAt || item.updatedAt || new Date().toISOString()
                  const planLabel = formatPlanType(item.salesReport?.plan?.planType || '')
                  return (
                    <div key={item.id} className="p-3 border-b">
                      <div className="text-sm font-semibold">⚠️ Invalid IMEI Alert</div>
                      <div className="text-xs text-gray-500">Date: {formatDateDMY(when)}</div>
                      <div className="text-sm mt-1">IMEI: {item.imei}</div>
                      <div className="text-sm">Plan: {planLabel}</div>
                      <div className="text-sm">₹{(item.deductionAmount || 0).toLocaleString('en-IN')} has been deducted from your total incentive.</div>
                      <div className="text-sm text-gray-700">Reason: {item.reason || 'IMEI not valid for voucher claim.'}</div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
