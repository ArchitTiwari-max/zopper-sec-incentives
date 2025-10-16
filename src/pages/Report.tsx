import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FaSpinner, FaArrowLeft } from 'react-icons/fa'
import { config } from '@/lib/config'
import { utils, writeFileXLSX } from 'xlsx'

// Real sales report interface from database
interface SalesReport {
  id: string
  imei: string
  planPrice: number
  incentiveEarned: number
  isPaid: boolean
  submittedAt: string
  store: {
    storeName: string
    city: string
  }
  samsungSKU: {
    Category: string
    ModelName: string
  }
  plan: {
    planType: string
    price: number
  }
}

// Processed day-wise data structure
interface DayRow {
  date: string // ISO
  adld: number
  combo: number
  screenProtect: number
  extendedWarranty: number
  totalReports: number
}

function formatDayMonYear(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Process raw reports into day-wise summary
function processReportsToDaily(reports: SalesReport[]): DayRow[] {
  const dayMap = new Map<string, DayRow>()
  
  reports.forEach(report => {
    const date = new Date(report.submittedAt).toISOString().split('T')[0]
    
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        adld: 0,
        combo: 0,
        screenProtect: 0,
        extendedWarranty: 0,
        totalReports: 0
      })
    }
    
    const dayRow = dayMap.get(date)!
    dayRow.totalReports++
    
    switch (report.plan.planType) {
      case 'ADLD_1_Yr':
        dayRow.adld++
        break
      case 'Combo_2Yrs':
        dayRow.combo++
        break
      case 'Screen_Protect_1_Yr':
        dayRow.screenProtect++
        break
      case 'Extended_Warranty_1_Yr':
        dayRow.extendedWarranty++
        break
    }
  })
  
  return Array.from(dayMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

const ADLD_RATE = 150
const COMBO_RATE = 250
const calcIncentive = (r: DayRow) => r.adld * ADLD_RATE + r.combo * COMBO_RATE

export function ReportPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState<SalesReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [dayFilter, setDayFilter] = useState<'today' | 'yesterday' | 'all'>('today')
  
  // Fetch reports on component mount
  useEffect(() => {
    const fetchReports = async () => {
      if (!auth?.token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
const response = await fetch(`${config.apiUrl}/sec/reports`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
        
        const data = await response.json()
        
        if (data.success) {
          setReports(data.data)
          setError(null)
        } else {
          setError(data.message || 'Failed to fetch reports')
        }
      } catch (error) {
        console.error('Error fetching reports:', error)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchReports()
  }, [auth?.token])

  // Process reports into daily summary
  const dailyData = useMemo(() => processReportsToDaily(reports), [reports])
  
  const filtered = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0]
    const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const byDay = (r: DayRow) => {
      if (dayFilter === 'all') return true
      if (dayFilter === 'today') return r.date === todayISO
      if (dayFilter === 'yesterday') return r.date === yesterdayISO
      return true
    }

    const byQuery = (r: DayRow) => {
      const text = `${formatDayMonYear(r.date)} ${r.adld} ${r.combo}`.toLowerCase()
      return !q || text.includes(q.toLowerCase())
    }
    const sorted = [...dailyData].sort((a, b) =>
      sortDesc ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)
    )
    return sorted.filter(byDay).filter(byQuery)
  }, [dailyData, q, sortDesc, dayFilter])

  const totals = useMemo(() => {
    const totalUnits = filtered.reduce((s, r) => s + r.adld + r.combo + r.screenProtect + r.extendedWarranty, 0)
    const totalIncentive = filtered.reduce((s, r) => s + calcIncentive(r), 0)
    const totalEarnedFromReports = reports.reduce((s, r) => s + r.incentiveEarned, 0)
    const paid = reports.filter(r => r.isPaid).reduce((s, r) => s + r.incentiveEarned, 0)
    return { 
      totalUnits, 
      totalIncentive: totalEarnedFromReports, 
      paid, 
      net: totalEarnedFromReports - paid 
    }
  }, [filtered, reports])

  const downloadExcel = () => {
    const rows = filtered.map((r) => ({
      Date: formatDayMonYear(r.date).replace(/\s\d{4}$/, ''),
      ADLD: r.adld,
      Combo: r.combo,
      'Total Units Sold': r.adld + r.combo,
      'Incentive Earned': calcIncentive(r),
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'SEC Report')
    writeFileXLSX(wb, 'sec-report.xlsx')
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card scroll-smooth">
      <button 
        onClick={() => navigate('/plan-sell-info')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
      >
        <FaArrowLeft className="text-sm" />
        <span className="text-sm font-medium">Back to Plan Sell Info</span>
      </button>
      <h2 className="text-lg font-semibold">Reporting</h2>
      <p className="text-sm text-gray-500">Summary for your entries</p>

      <div className="flex flex-col sm:flex-row gap-2 mt-3 items-center">
        <div className="flex gap-2">
          <button onClick={() => setDayFilter('today')} className={`px-3 py-2 rounded-2xl border ${dayFilter==='today' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>Today</button>
          <button onClick={() => setDayFilter('yesterday')} className={`px-3 py-2 rounded-2xl border ${dayFilter==='yesterday' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>Yesterday</button>
          <button onClick={() => setDayFilter('all')} className={`px-3 py-2 rounded-2xl border ${dayFilter==='all' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>All</button>
        </div>
        <input
          className="flex-1 px-3 py-2 border rounded-2xl"
          placeholder="Search (e.g., 15 Oct)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setSortDesc(s => !s)} className="button-gradient px-4 py-2">Sort by Date {sortDesc ? '↓' : '↑'}</button>
        <button onClick={downloadExcel} className="button-gradient px-4 py-2">Download Report (Excel)</button>
      </div>

      <div className="mt-3 overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3 align-bottom" rowSpan={2}>Date</th>
              <th className="p-3 text-center" colSpan={2}>Plan Type</th>
              <th className="p-3 align-bottom" rowSpan={2}>Total Units Sold</th>
              <th className="p-3 align-bottom" rowSpan={2}>Incentive Earned</th>
            </tr>
            <tr className="bg-gray-50 text-left">
              <th className="p-3">ADLD</th>
              <th className="p-3">Combo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const totalUnits = r.adld + r.combo
              const incentive = calcIncentive(r)
              return (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{formatDayMonYear(r.date).replace(/\s\d{4}$/, '')}</td>
                  <td className="p-3">{r.adld}</td>
                  <td className="p-3">{r.combo}</td>
                  <td className="p-3">{totalUnits}</td>
                  <td className="p-3">{incentive}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={5}>No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium mb-2">Summary</div>
        <div className="grid grid-cols-1 gap-3">
          <GradientCard title="Total Units Sold" value={`${totals.totalUnits}`} />
          <GradientCard title="Total Earned Incentive" value={`₹${totals.totalIncentive}`} />
          <GradientCard title="Paid Incentive (Gift Voucher)" value={`₹${totals.paid}`} />
          <GradientCard title="Net Available Balance" value={`₹${totals.net}`} />
        </div>
      </div>
    </motion.div>
  )
}

function GradientCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 text-white shadow-md bg-gradient-to-r from-blue-500 to-blue-700">
      <div className="text-xs opacity-90">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  )
}
