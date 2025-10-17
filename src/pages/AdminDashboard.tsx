import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { utils, writeFileXLSX } from 'xlsx'
import { FaSignOutAlt, FaSpinner } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isAdminUser } from '@/lib/auth'
import { config } from '@/lib/config'

interface SalesReport {
  id: string
  imei: string
  planPrice: number
  incentiveEarned: number
  isPaid: boolean
  submittedAt: string
  secUser: {
    secId: string | null
    phone: string
    name: string | null
  }
  store: {
    id: string
    storeName: string
    city: string
  }
  samsungSKU: {
    id: string
    Category: string
    ModelName: string
  }
  plan: {
    id: string
    planType: string
    price: number
  }
}

function formatDateWithTime(ts: string) {
  // Accepts 'YYYY-MM-DD HH:mm' or ISO; returns object with date and time
  const iso = ts.includes(' ') ? ts.replace(' ', 'T') : ts
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { date: ts, time: '' }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return {
    date: `${dd}-${mm}-${yyyy}`,
    time: `${hh}:${min}`
  }
}

export function AdminDashboard() {
  const { auth, logout, user } = useAuth()
  const navigate = useNavigate()
  
  const adminUser = user && isAdminUser(user) ? user : null
  const [data, setData] = useState<SalesReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      if (!auth?.token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const response = await fetch(`${config.apiUrl}/reports/admin`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
        
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
          setError(null)
        } else {
          setError(result.message || 'Failed to fetch reports')
        }
      } catch (error) {
        console.error('Error fetching admin reports:', error)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchReports()
  }, [auth?.token])

  const stores = useMemo(() => Array.from(new Set(data.map(d => d.store.storeName))), [data])
  const plans = useMemo(() => Array.from(new Set(data.map(d => d.plan.planType))), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      const matchesQuery = [
        r.secUser.secId || r.secUser.phone, 
        r.store.storeName, 
        r.samsungSKU.ModelName,
        r.imei
      ].some(v => v.toLowerCase().includes(query.toLowerCase()))
      const matchesStore = !storeFilter || r.store.storeName === storeFilter
      const matchesPlan = !planFilter || r.plan.planType === planFilter
      return matchesQuery && matchesStore && matchesPlan
    })
  }, [data, query, storeFilter, planFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => {
    setPage(1)
  }, [query, storeFilter, planFilter])

  const totals = useMemo(() => {
    const totalIncentive = filtered.reduce((s, r) => s + r.incentiveEarned, 0)
    const totalPaid = filtered.filter(r => r.isPaid).reduce((s, r) => s + r.incentiveEarned, 0)
    const totalSECs = new Set(filtered.map(r => r.secUser.secId || r.secUser.phone)).size
    return { totalSECs, totalReports: filtered.length, totalIncentive, totalPaid }
  }, [filtered])

  const exportExcel = () => {
    const ws = utils.json_to_sheet(filtered)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Reports')
    writeFileXLSX(wb, 'all-reports.xlsx')
  }

  const togglePaid = async (idx: number) => {
    const report = pageData[idx]
    if (!auth?.token) return
    
    try {
      const response = await fetch(`${config.apiUrl}/reports/${report.id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ isPaid: true })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update the local state
        setData(prev => prev.map(r => 
          r.id === report.id ? { ...r, isPaid: true } : r
        ))
      } else {
        alert(result.message || 'Failed to update payment status')
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Network error. Please try again.')
    }
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      </motion.div>
    )
  }
  
  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="button-gradient px-4 py-2"
          >
            Retry
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-y-auto overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-md p-2 lg:p-4 mx-2 lg:mx-4 my-2 lg:my-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm mb-1">Welcome, <span className="font-semibold">{adminUser?.name || 'Admin'}</span></div>
          <div className="text-base">
            No of Incentive Paid: {filtered.filter(r => r.isPaid).length} | Unpaid: {filtered.filter(r => !r.isPaid).length}
          </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard title="SECs Active" value={totals.totalSECs.toString()} />
        <StatCard title="Reports Submitted" value={totals.totalReports.toString()} />
        <StatCard title="Incentive Earned" value={`₹${totals.totalIncentive}`} />
        <StatCard title="Incentive Paid" value={`₹${totals.totalPaid}`} />
      </div>

      <div className="flex flex-col lg:flex-row gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border rounded-2xl"
          placeholder="Search SEC / Store / Device"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="px-3 py-2 border rounded-2xl" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
          <option value="">All Stores</option>
          {stores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-2xl" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          {plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={exportExcel} className="button-gradient px-4 py-2">Export to Excel</button>
      </div>

      <div className="border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-1 lg:p-2 w-[11%] text-xs lg:text-sm">Timestamp</th>
              <th className="p-1 lg:p-2 w-[9%] text-xs lg:text-sm">SEC ID</th>
              <th className="p-1 lg:p-2 w-[18%] text-xs lg:text-sm">Store Name</th>
              <th className="p-1 lg:p-2 w-[12%] text-xs lg:text-sm">Device Name</th>
              <th className="p-1 lg:p-2 w-[8%] text-xs lg:text-sm">Plan Type</th>
              <th className="p-1 lg:p-2 w-[15%] text-xs lg:text-sm">IMEI</th>
              <th className="p-1 lg:p-2 w-[10%] text-xs lg:text-sm">Incentive Earned</th>
              <th className="p-1 lg:p-2 w-[9%] text-xs lg:text-sm">Status</th>
              <th className="p-1 lg:p-2 w-[8%] text-xs lg:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-1 lg:p-2 text-xs text-left">
                  <div className="flex flex-col">
                    <div className="font-medium">{formatDateWithTime(r.submittedAt).date}</div>
                    <div className="text-gray-600">{formatDateWithTime(r.submittedAt).time}</div>
                  </div>
                </td>
                <td className="p-1 lg:p-2 text-xs">{r.secUser.secId || r.secUser.phone}</td>
                <td className="p-1 lg:p-2 text-xs truncate" title={r.store.storeName}>{r.store.storeName}</td>
                <td className="p-1 lg:p-2 text-xs truncate" title={r.samsungSKU.ModelName}>{r.samsungSKU.ModelName}</td>
                <td className="p-1 lg:p-2 text-xs">{r.plan.planType}</td>
                <td className="p-1 lg:p-2 text-xs font-mono truncate" title={r.imei}>{r.imei}</td>
                <td className="p-1 lg:p-2 text-xs font-semibold">₹{r.incentiveEarned}</td>
                <td className="p-1 lg:p-2">
                  <span className={`px-1 py-0.5 rounded text-xs font-medium ${r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className="p-1 lg:p-2">
                  {!r.isPaid && (
                    <button onClick={() => togglePaid(i)} className="button-gradient px-1 lg:px-2 py-0.5 text-xs whitespace-nowrap">Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={9}>No reports found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <button disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded-2xl disabled:opacity-50">Prev</button>
          <button disabled={page===totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1 border rounded-2xl disabled:opacity-50">Next</button>
        </div>
      </div>
      </motion.div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 text-white shadow-md bg-gradient-to-r from-blue-500 to-blue-700">
      <div className="text-xs opacity-90">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  )
}
