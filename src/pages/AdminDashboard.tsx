import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { utils, writeFileXLSX } from 'xlsx'
import { FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isAdminUser } from '@/lib/auth'

interface ReportRow {
  timestamp: string
  secId: string
  store: string
  device: string
  plan: 'Silver' | 'Gold' | 'Platinum'
  planPrice: number
  imei: string
  incentiveEarned: number
  paid: boolean
}

const initialData: ReportRow[] = [
  { timestamp: '2025-10-01 10:00', secId: 'SEC12345', store: 'Store A', device: 'Device X', plan: 'Silver', planPrice: 99, imei: '356789012345678', incentiveEarned: 99, paid: true },
  { timestamp: '2025-10-05 14:22', secId: 'SEC56789', store: 'Store B', device: 'Device Y', plan: 'Gold', planPrice: 199, imei: '352345678901234', incentiveEarned: 199, paid: false },
  { timestamp: '2025-10-08 09:15', secId: 'SEC12345', store: 'Store A', device: 'Device Z', plan: 'Platinum', planPrice: 299, imei: '354567890123456', incentiveEarned: 299, paid: false },
  { timestamp: '2025-10-10 16:45', secId: 'SEC24680', store: 'Store C', device: 'Device X', plan: 'Gold', planPrice: 199, imei: '358901234567890', incentiveEarned: 199, paid: true },
]

function formatDateOnly(ts: string) {
  // Accepts 'YYYY-MM-DD HH:mm' or ISO; returns 'dd mm yyyy'
  const iso = ts.includes(' ') ? ts.replace(' ', 'T') : ts
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ts
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd} ${mm} ${yyyy}`
}

export function AdminDashboard() {
  const { auth, logout, user } = useAuth()
  const navigate = useNavigate()
  
  const adminUser = user && isAdminUser(user) ? user : null
  const [data, setData] = useState<ReportRow[]>(initialData)
  const [query, setQuery] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5
  
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const stores = useMemo(() => Array.from(new Set(data.map(d => d.store))), [data])
  const plans = ['Silver', 'Gold', 'Platinum'] as const

  const filtered = useMemo(() => {
    return data.filter(r => {
      const matchesQuery = [r.secId, r.store, r.device].some(v => v.toLowerCase().includes(query.toLowerCase()))
      const matchesStore = !storeFilter || r.store === storeFilter
      const matchesPlan = !planFilter || r.plan === planFilter
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
    const totalPaid = filtered.filter(r => r.paid).reduce((s, r) => s + r.incentiveEarned, 0)
    const totalSECs = new Set(filtered.map(r => r.secId)).size
    return { totalSECs, totalReports: filtered.length, totalIncentive, totalPaid }
  }, [filtered])

  const exportExcel = () => {
    const ws = utils.json_to_sheet(filtered)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Reports')
    writeFileXLSX(wb, 'all-reports.xlsx')
  }

  const togglePaid = (idx: number) => {
    const globalIndex = (page - 1) * pageSize + idx
    setData(prev => prev.map((r, i) => i === globalIndex ? { ...r, paid: !r.paid } : r))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm mb-1">Welcome, <span className="font-semibold">{adminUser?.name || 'Admin'}</span></div>
          <h2 className="text-lg font-semibold">Spot Incentive Admin Dashboard</h2>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard title="SECs Active" value={totals.totalSECs.toString()} />
        <StatCard title="Reports Submitted" value={totals.totalReports.toString()} />
        <StatCard title="Incentive Earned" value={`₹${totals.totalIncentive}`} />
        <StatCard title="Incentive Paid" value={`₹${totals.totalPaid}`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
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

      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Timestamp</th>
              <th className="p-3">SEC ID</th>
              <th className="p-3">Store Name</th>
              <th className="p-3">Device Name</th>
              <th className="p-3">Plan Type</th>
              <th className="p-3">Plan Price</th>
              <th className="p-3">IMEI</th>
              <th className="p-3">Incentive Earned</th>
              <th className="p-3">Incentive Paid</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{formatDateOnly(r.timestamp)}</td>
                <td className="p-3">{r.secId}</td>
                <td className="p-3">{r.store}</td>
                <td className="p-3">{r.device}</td>
                <td className="p-3">{r.plan}</td>
                <td className="p-3">₹{r.planPrice}</td>
                <td className="p-3">{r.imei}</td>
                <td className="p-3">₹{r.incentiveEarned}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.paid ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => togglePaid(i)} className="button-gradient px-3 py-1">Mark as {r.paid ? 'Pending' : 'Paid'}</button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={10}>No reports found</td></tr>
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
