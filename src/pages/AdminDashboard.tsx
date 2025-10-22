import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { utils, writeFileXLSX } from 'xlsx'
import { FaSignOutAlt, FaSpinner, FaEllipsisH, FaDownload, FaTrophy, FaFileUpload, FaTimes } from 'react-icons/fa'
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
  voucherCode?: string
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
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [showMultiSelect, setShowMultiSelect] = useState(false)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [isLive, setIsLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [actionsOpen, setActionsOpen] = useState(false)
  
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  // Fetch reports from API
  const fetchReports = async (isInitialLoad = false) => {
    if (!auth?.token) {
      setError('Authentication required')
      setLoading(false)
      return
    }
    
    try {
      if (isInitialLoad) setLoading(true)
      
      const response = await fetch(`${config.apiUrl}/reports/admin`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
        setLastUpdated(new Date())
      } else {
        setError(result.message || 'Failed to fetch reports')
      }
    } catch (error) {
      console.error('Error fetching admin reports:', error)
      setError('Network error. Please try again.')
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }
  
  // Initial load
  useEffect(() => {
    if (auth?.token) {
      fetchReports(true)
    }
  }, [auth?.token])
  
  // Polling for real-time updates
  useEffect(() => {
    if (!auth?.token || !isLive) return
    
    const interval = setInterval(() => {
      // Don't refresh while user is actively selecting items or in bulk operations
      if (!showMultiSelect && !bulkLoading) {
        fetchReports(false)
      }
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [auth?.token, isLive, showMultiSelect, bulkLoading])

  const stores = useMemo(() => Array.from(new Set(data.map(d => d.store.storeName))), [data])
  const plans = useMemo(() => Array.from(new Set(data.map(d => d.plan.planType))), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      // Exclude 'teststore' from all admin stats
      const isTestStore = (r.store.storeName || '').replace(/\s+/g, '').toLowerCase() === 'teststore'
      if (isTestStore) return false
      const matchesQuery = [
        r.secUser.secId || r.secUser.phone, 
        r.store.storeName, 
        r.samsungSKU.ModelName,
        r.imei
      ].some(v => v.toLowerCase().includes(query.toLowerCase()))
      const matchesStore = !storeFilter || r.store.storeName === storeFilter
      const matchesPlan = !planFilter || r.plan.planType === planFilter
      const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? r.isPaid : !r.isPaid)
      return matchesQuery && matchesStore && matchesPlan && matchesPayment
    })
  }, [data, query, storeFilter, planFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => {
    setPage(1)
  }, [query, storeFilter, planFilter, paymentFilter])

  const totals = useMemo(() => {
    const totalIncentive = filtered.reduce((s, r) => s + r.incentiveEarned, 0)
    const totalPaid = filtered.filter(r => r.isPaid).reduce((s, r) => s + r.incentiveEarned, 0)
    const totalSECs = new Set(filtered.map(r => r.secUser.secId || r.secUser.phone)).size
    const activeStores = new Set(filtered.map(r => r.store.id)).size
    return { totalSECs, totalReports: filtered.length, totalIncentive, totalPaid, activeStores }
  }, [filtered])

  const exportExcel = () => {
    // Transform data to show readable names instead of IDs
    const exportData = filtered.map(report => ({
      'Report ID': report.id,
      'SEC ID': report.secUser.secId || 'Not Set',
      'SEC Phone': report.secUser.phone,
      'SEC Name': report.secUser.name || 'Not Set',
      'Store Name': report.store.storeName,
      'Store City': report.store.city,
      'Device Category': report.samsungSKU.Category,
      'Device Model': report.samsungSKU.ModelName,
      'Plan Type': report.plan.planType.replace(/_/g, ' '),
      'Plan Price': `₹${report.planPrice}`,
      'IMEI': report.imei,
      'Incentive Earned': `₹${report.incentiveEarned}`,
      'Payment Status': report.isPaid ? 'Paid' : 'Pending',
      'Submitted Date': formatDateWithTime(report.submittedAt).date,
      'Submitted Time': formatDateWithTime(report.submittedAt).time,
      'Voucher Code': report.voucherCode || ''
    }))
    
    const ws = utils.json_to_sheet(exportData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Sales Reports')
    writeFileXLSX(wb, `sales-reports-${new Date().toISOString().split('T')[0]}.xlsx`)
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

  const handleSelectAll = () => {
    const unpaidReports = pageData.filter(r => !r.isPaid).map(r => r.id)
    if (selectedReports.size === unpaidReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(unpaidReports))
    }
  }

  const handleSelectReport = (reportId: string) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  const handleBulkMarkPaid = async () => {
    if (selectedReports.size === 0 || !auth?.token) return
    
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedReports).map(reportId =>
        fetch(`${config.apiUrl}/reports/${reportId}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({ isPaid: true })
        })
      )
      
      await Promise.all(promises)
      
      // Update local state
      setData(prev => prev.map(r => 
        selectedReports.has(r.id) ? { ...r, isPaid: true } : r
      ))
      
      // Reset selection
      setSelectedReports(new Set())
      setShowMultiSelect(false)
      
      alert(`Successfully marked ${selectedReports.size} reports as paid!`)
    } catch (error) {
      console.error('Error in bulk update:', error)
      alert('Some updates may have failed. Please refresh the page.')
    } finally {
      setBulkLoading(false)
    }
  }

  const cancelMultiSelect = () => {
    setShowMultiSelect(false)
    setSelectedReports(new Set())
  }

  const handleDiscardReport = async (reportId: string, imei: string) => {
    if (!confirm(`Are you sure you want to discard the report for IMEI: ${imei}? This action cannot be undone.`)) {
      return
    }
    
    if (!auth?.token) return
    
    try {
      const response = await fetch(`${config.apiUrl}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Remove from local state
        setData(prev => prev.filter(r => r.id !== reportId))
        alert('Report discarded successfully!')
      } else {
        alert(result.message || 'Failed to discard report')
      }
    } catch (error) {
      console.error('Error discarding report:', error)
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
          <div className="text-base mb-2">
            No of Incentive Paid: {filtered.filter(r => r.isPaid).length} | Unpaid: {filtered.filter(r => !r.isPaid).length}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span>{isLive ? 'Live' : 'Paused'}</span>
            </div>
            <span>•</span>
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            <button 
              onClick={() => fetchReports(false)} 
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Refresh
            </button>
            <button 
              onClick={() => setIsLive(!isLive)} 
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              {isLive ? 'Pause' : 'Resume'} Auto-refresh
            </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard title="Active Stores" value={totals.activeStores.toString()} />
        <StatCard title="SECs Active" value={totals.totalSECs.toString()} />
        <StatCard title="Reports Submitted" value={totals.totalReports.toString()} />
        <StatCard title="Incentive Earned" value={`₹${totals.totalIncentive}`} />
        <StatCard title="Incentive Paid" value={`₹${totals.totalPaid}`} />
      </div>

      <div className="flex flex-col lg:flex-row lg:flex-wrap items-center gap-2 mb-3">
        <input
          className="flex-1 min-w-[220px] px-3 py-2 border rounded-2xl"
          placeholder="Search SEC / Store / Device / IMEI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="px-3 py-2 border rounded-2xl w-56 shrink-0" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
          <option value="">All Stores</option>
          {stores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-2xl w-40 shrink-0" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          {plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-2xl w-28 shrink-0" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <div className="relative shrink-0">
          <button 
            onClick={() => setActionsOpen(o => !o)} 
            className="px-4 py-2 border rounded-2xl bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaEllipsisH /> Actions
          </button>
          {actionsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border z-20">
              <button 
                onClick={() => { setActionsOpen(false); exportExcel() }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <FaDownload /> Export to Excel
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/leaderboard') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <FaTrophy /> View Leaderboard
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/voucher-processor') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <FaFileUpload /> Process Voucher Excel
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/invalid-imei-processor') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <FaTimes /> Process Invalid IMEIs
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/test-results') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                📝 View Test Results
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/test-invites') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                📩 Send Test Invites
              </button>
              <button 
                onClick={() => { setActionsOpen(false); navigate('/admin/proctoring') }} 
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                🛡️ Proctoring Alerts
              </button>
            </div>
          )}
        </div>
        
        {!showMultiSelect ? (
          <button 
            onClick={() => setShowMultiSelect(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-2xl hover:bg-blue-700 transition-colors"
          >
            Mark Multiple as Paid
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleBulkMarkPaid} 
              disabled={selectedReports.size === 0 || bulkLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkLoading ? 'Processing...' : `Pay Selected (${selectedReports.size})`}
            </button>
            <button 
              onClick={cancelMultiSelect} 
              className="bg-gray-500 text-white px-4 py-2 rounded-2xl hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              {showMultiSelect && (
                <th className="p-1 lg:p-2 w-[5%] text-xs lg:text-sm">
                  <div className="flex items-center gap-1">
                    <input 
                      type="checkbox" 
                      id="select-all-checkbox"
                      onChange={handleSelectAll}
                      checked={selectedReports.size > 0 && selectedReports.size === pageData.filter(r => !r.isPaid).length}
                      className="rounded"
                    />
                    <label htmlFor="select-all-checkbox" className="text-xs cursor-pointer select-none">
                      Select All
                    </label>
                  </div>
                </th>
              )}
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[10%]' : 'w-[11%]'}`}>Timestamp</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[8%]' : 'w-[9%]'}`}>SEC ID</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[16%]' : 'w-[18%]'}`}>Store Name</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[11%]' : 'w-[12%]'}`}>Device Name</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[7%]' : 'w-[8%]'}`}>Plan Type</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[13%]' : 'w-[15%]'}`}>IMEI</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[9%]' : 'w-[10%]'}`}>Incentive Earned</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[8%]' : 'w-[9%]'}`}>Status</th>
              <th className={`p-1 lg:p-2 text-xs lg:text-sm ${showMultiSelect ? 'w-[7%]' : 'w-[8%]'}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                {showMultiSelect && (
                  <td className="p-1 lg:p-2 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedReports.has(r.id)}
                      onChange={() => handleSelectReport(r.id)}
                      disabled={r.isPaid}
                      className="rounded"
                    />
                  </td>
                )}
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
                  <div className="flex flex-col gap-1">
                    {!r.isPaid && (
                      <button onClick={() => togglePaid(i)} className="button-gradient px-1 lg:px-2 py-0.5 text-xs whitespace-nowrap">Mark Paid</button>
                    )}
                    <button 
                      onClick={() => handleDiscardReport(r.id, r.imei)} 
                      className="bg-red-500 text-white px-1 lg:px-2 py-0.5 text-xs whitespace-nowrap rounded hover:bg-red-600 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={showMultiSelect ? 10 : 9}>No reports found</td></tr>
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
