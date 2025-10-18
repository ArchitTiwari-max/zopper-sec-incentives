import { useEffect, useMemo, useState } from 'react'
import { FaBell, FaSpinner } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { formatPlanType } from '@/lib/api'

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

export default function SecDeductionsBell() {
  const { auth } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<DeductionItem[]>([])

  const lastSeenKey = auth?.role === 'sec' && auth.user && 'phone' in auth.user
    ? `deductions:lastSeen:sec:${(auth.user as any).phone}`
    : 'deductions:lastSeen'

  const getLastSeen = () => {
    const v = localStorage.getItem(lastSeenKey)
    return v ? new Date(v) : null
  }
  const setLastSeen = (d: Date) => localStorage.setItem(lastSeenKey, d.toISOString())

  const unread = useMemo(() => {
    const lastSeen = getLastSeen()
    if (!lastSeen) return items.length
    return items.filter(i => new Date(i.processedAt || i.createdAt || i.updatedAt || 0) > lastSeen).length
  }, [items])

  const fetchItems = async () => {
    if (!auth?.token) return
    setLoading(true)
    try {
      const res = await fetch(`${config.apiUrl}/sec/deductions`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      const json = await res.json()
      if (json.success) setItems(json.data as DeductionItem[])
    } catch (e) {
      console.error('Failed to fetch deductions', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    const id = setInterval(fetchItems, 60000)
    return () => clearInterval(id)
  }, [auth?.token])

  const markAllSeen = () => {
    setLastSeen(new Date())
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 rounded-lg">
        <FaBell />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold text-sm">Notifications</div>
            <button onClick={markAllSeen} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-600 flex items-center gap-2"><FaSpinner className="animate-spin" /> Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map(item => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}