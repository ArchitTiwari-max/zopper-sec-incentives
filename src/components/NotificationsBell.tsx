import { useEffect, useMemo, useState } from 'react'
import { FaBell, FaCheck, FaSpinner } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  readAt?: string | null
}

export default function NotificationsBell() {
  const { auth } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])

  const unread = useMemo(() => items.filter(i => !i.readAt).length, [items])

  const fetchItems = async () => {
    if (!auth?.token) return
    setLoading(true)
    try {
const res = await authFetch(`${config.apiUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      const json = await res.json()
      if (json.success) setItems(json.data)
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    const id = setInterval(fetchItems, 60000)
    return () => clearInterval(id)
  }, [auth?.token])

  const markAllRead = async () => {
    if (!auth?.token) return
    try {
await authFetch(`${config.apiUrl}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
      setItems(prev => prev.map(i => ({ ...i, readAt: new Date().toISOString() })))
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
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
            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <FaCheck size={10} /> Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-600 flex items-center gap-2"><FaSpinner className="animate-spin" /> Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map(item => (
                <div key={item.id} className={`p-3 border-b ${!item.readAt ? 'bg-blue-50/40' : ''}`}>
                  <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-sm text-gray-700">{item.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
