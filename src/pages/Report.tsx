import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FaSpinner, FaArrowLeft } from 'react-icons/fa'
import { config } from '@/lib/config'
import { utils, writeFileXLSX } from 'xlsx'
import { authFetch } from '@/lib/http'

// Real sales report interface from database
interface SalesReport {
  id: string
  imei: string
  planPrice: number
  incentiveEarned: number
  isPaid: boolean
  submittedAt: string
  voucherCode?: string
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

// Voucher report interface (reports with voucher codes)
interface VoucherReport {
  id: string
  incentiveEarned: number
  submittedAt: string
  voucherCode: string
  samsungSKU: {
    ModelName: string
  }
  plan: {
    planType: string
  }
}

// Deduction interface
interface DeductionReport {
  id: string
  imei: string
  deductionAmount: number
  reason: string
  processedAt: string
  salesReport: {
    store: {
      storeName: string
      city: string
    }
    samsungSKU: {
      ModelName: string
      Category: string
    }
    plan: {
      planType: string
      price: number
    }
  }
}


// Transaction interface for combined view
interface Transaction {
  id: string
  date: string // ISO format
  type: 'earning' | 'deduction'
  amount: number // positive for earnings, negative for deductions
  description: string
  imei?: string
  planType: string
  deviceName: string
  storeName?: string
  voucherCode?: string
  reason?: string
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

// IST offset helper (UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function formatDayMonYear(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDDMMYYYY(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

// Process raw reports into day-wise summary
function processReportsToDaily(reports: SalesReport[]): DayRow[] {
  const dayMap = new Map<string, DayRow>()
  
  reports.forEach(report => {
    const utcMs = new Date(report.submittedAt).getTime()
    const date = new Date(utcMs + IST_OFFSET_MS).toISOString().split('T')[0]
    
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

const ADLD_RATE = 100
const COMBO_RATE = 300
const calcIncentive = (r: DayRow) => r.adld * ADLD_RATE + r.combo * COMBO_RATE

export function ReportPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState<SalesReport[]>([])
  const [voucherReports, setVoucherReports] = useState<VoucherReport[]>([])
  const [deductions, setDeductions] = useState<DeductionReport[]>([])
  const [loading, setLoading] = useState(true)
  const [voucherLoading, setVoucherLoading] = useState(true)
  const [deductionLoading, setDeductionLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [deductionError, setDeductionError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [dayFilter, setDayFilter] = useState<'today' | 'yesterday' | 'all'>('today')
  
  // Fetch reports and vouchers on component mount
  useEffect(() => {
    const fetchReports = async () => {
      if (!auth?.token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
const response = await authFetch(`${config.apiUrl}/sec/reports`, {
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

    const fetchVoucherReports = async () => {
      if (!auth?.token) {
        setVoucherError('Authentication required')
        setVoucherLoading(false)
        return
      }
      
      try {
        setVoucherLoading(true)
const response = await authFetch(`${config.apiUrl}/vouchers/sec`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
        
        const data = await response.json()
        
        if (data.success) {
          setVoucherReports(data.data)
          setVoucherError(null)
        } else {
          setVoucherError(data.message || 'Failed to fetch voucher reports')
        }
      } catch (error) {
        console.error('Error fetching voucher reports:', error)
        setVoucherError('Network error. Please try again.')
      } finally {
        setVoucherLoading(false)
      }
    }

    
    const fetchDeductions = async () => {
      if (!auth?.token) {
        setDeductionError('Authentication required')
        setDeductionLoading(false)
        return
      }
      
      try {
        setDeductionLoading(true)
const response = await authFetch(`${config.apiUrl}/sec/deductions`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
        
        const data = await response.json()
        
        if (data.success) {
          setDeductions(data.data)
          setDeductionError(null)
        } else {
          setDeductionError(data.message || 'Failed to fetch deductions')
        }
      } catch (error) {
        console.error('Error fetching deductions:', error)
        setDeductionError('Network error. Please try again.')
      } finally {
        setDeductionLoading(false)
      }
    }
    
    fetchReports()
    fetchVoucherReports()
    fetchDeductions()
  }, [auth?.token])

  // Process reports and deductions into combined transactions
  const transactions = useMemo((): Transaction[] => {
    const combined: Transaction[] = []
    
    // Add earning transactions from reports
    reports.forEach(report => {
      combined.push({
        id: report.id,
        date: report.submittedAt,
        type: 'earning',
        amount: report.incentiveEarned,
        description: `Plan Sale - ${report.plan.planType.replace(/_/g, ' ')}`,
        imei: report.imei,
        planType: report.plan.planType,
        deviceName: report.samsungSKU.ModelName,
        storeName: report.store.storeName,
        voucherCode: report.voucherCode
      })
    })
    
    // Add deduction transactions
    deductions.forEach(deduction => {
      combined.push({
        id: deduction.id,
        date: deduction.processedAt,
        type: 'deduction',
        amount: -deduction.deductionAmount,
        description: `Deduction - ${deduction.reason}`,
        imei: deduction.imei,
        planType: deduction.salesReport.plan.planType,
        deviceName: deduction.salesReport.samsungSKU.ModelName,
        storeName: deduction.salesReport.store.storeName,
        reason: deduction.reason
      })
    })
    
    // Sort by date descending (newest first)
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [reports, deductions])
  
  // Process reports into daily summary
  const dailyData = useMemo(() => processReportsToDaily(reports), [reports])
  
  const filtered = useMemo(() => {
    const istNow = new Date(Date.now() + IST_OFFSET_MS)
    const todayISO = istNow.toISOString().split('T')[0]
    const yesterdayISO = new Date(istNow.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const byDay = (r: DayRow) => {
      if (dayFilter === 'all') return true
      if (dayFilter === 'today') return r.date === todayISO
      if (dayFilter === 'yesterday') return r.date === yesterdayISO
      return true
    }

    const byQuery = (r: DayRow) => {
      const text = `${formatDDMMYYYY(r.date)} ${r.adld} ${r.combo}`.toLowerCase()
      return !q || text.includes(q.toLowerCase())
    }
    const sorted = [...dailyData].sort((a, b) =>
      sortDesc ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)
    )
    return sorted.filter(byDay).filter(byQuery)
  }, [dailyData, q, sortDesc, dayFilter])

  const totals = useMemo(() => {
    const totalUnits = filtered.reduce((s, r) => s + r.adld + r.combo + r.screenProtect + r.extendedWarranty, 0)
    const totalEarnedFromReports = reports.reduce((s, r) => s + r.incentiveEarned, 0)
    const totalDeducted = deductions.reduce((s, d) => s + d.deductionAmount, 0)
    const paid = reports.filter(r => r.isPaid).reduce((s, r) => s + r.incentiveEarned, 0)
    const netIncentive = totalEarnedFromReports - totalDeducted
    
    return { 
      totalUnits, 
      totalIncentive: totalEarnedFromReports,
      totalDeducted,
      paid, 
      net: netIncentive - paid 
    }
  }, [filtered, reports, deductions])

  const downloadExcel = () => {
    const rows = transactions.map((transaction) => ({
      Date: formatDDMMYYYY(transaction.date),
      IMEI: transaction.imei || '',
      'Device Name': transaction.deviceName,
      'Plan Type': transaction.planType.replace(/_/g, ' '),
      'Transaction Type': transaction.type === 'earning' ? 'Earning' : 'Deduction',
      'Amount': transaction.amount,
      'Description': transaction.description,
      'Reason': transaction.reason || '',
      'Voucher Code': transaction.voucherCode || '',
      'Store Name': transaction.storeName || ''
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Incentive Passbook')
    writeFileXLSX(wb, 'incentive-passbook.xlsx')
  }

  if (loading || deductionLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      </motion.div>
    )
  }
  
  if (error || deductionError) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">❌ {error || deductionError}</div>
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
      <h2 className="text-lg font-semibold">Incentive Passbook</h2>
      <p className="text-sm text-gray-500">Summary for your entries</p>

      <div className="flex flex-col sm:flex-row gap-2 mt-3 items-stretch sm:items-center">
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
          <button onClick={() => setDayFilter('today')} className={`px-3 py-3 sm:py-2 rounded-2xl border w-full ${dayFilter==='today' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>Today</button>
          <button onClick={() => setDayFilter('yesterday')} className={`px-3 py-3 sm:py-2 rounded-2xl border w-full ${dayFilter==='yesterday' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>Yesterday</button>
          <button onClick={() => setDayFilter('all')} className={`px-3 py-3 sm:py-2 rounded-2xl border w-full ${dayFilter==='all' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>All</button>
        </div>
        <input
          className="w-full sm:flex-1 px-3 py-3 sm:py-2 border rounded-2xl"
          placeholder="Search (e.g., 15-10-2025)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setSortDesc(s => !s)} className="button-gradient w-full sm:w-auto px-4 py-3 sm:py-2">Sort by Date {sortDesc ? '↓' : '↑'}</button>
        <button onClick={downloadExcel} className="button-gradient w-full sm:w-auto px-4 py-3 sm:py-2">Download Report</button>
      </div>

      {/* Daily summary table (Date, ADLD, Combo, Total Units Sold, Incentive Earned) */}
      <div className="mt-3 overflow-auto rounded-2xl border">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2 sm:p-3">Date</th>
              <th className="p-2 sm:p-3">ADLD</th>
              <th className="p-2 sm:p-3">Combo</th>
              <th className="p-2 sm:p-3">Total Units Sold</th>
              <th className="p-2 sm:p-3">Incentive Earned</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={5}>No data found</td>
              </tr>
            ) : (
              filtered.map((row) => {
                const totalUnits = row.adld + row.combo
                const incentive = calcIncentive(row)
                return (
                  <tr key={row.date} className="border-t hover:bg-gray-50">
                    <td className="p-2 sm:p-3 whitespace-nowrap">{formatDDMMYYYY(row.date)}</td>
                    <td className="p-2 sm:p-3">{row.adld}</td>
                    <td className="p-2 sm:p-3">{row.combo}</td>
                    <td className="p-2 sm:p-3">{totalUnits}</td>
                    <td className="p-2 sm:p-3 font-semibold">₹{incentive}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Incentive Voucher Section */}
      <div className="mt-8">
        <div className="text-lg font-semibold mb-2">💳 Incentive Voucher Codes</div>
        <p className="text-sm text-gray-500 mb-4">Your redeemed incentive vouchers</p>
        
        {voucherLoading ? (
          <div className="flex items-center justify-center py-8">
            <FaSpinner className="animate-spin text-lg text-blue-600" />
            <span className="ml-2 text-gray-600">Loading vouchers...</span>
          </div>
        ) : voucherError ? (
          <div className="text-center py-8 bg-red-50 rounded-2xl">
            <div className="text-red-600 text-sm">❌ {voucherError}</div>
          </div>
        ) : voucherReports.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-2">🎫</div>
            <div className="text-gray-600 text-sm">No voucher codes available yet</div>
            <div className="text-gray-500 text-xs mt-1">Voucher codes will appear here once your incentives are processed</div>
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-2 sm:p-3">Date</th>
                  <th className="p-2 sm:p-3">Device Name</th>
                  <th className="p-2 sm:p-3">Plan Name</th>
                  <th className="p-2 sm:p-3">Incentive Earned</th>
                  <th className="p-2 sm:p-3">Voucher Code</th>
                </tr>
              </thead>
              <tbody>
                {voucherReports.map((voucher) => (
                  <tr key={voucher.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 sm:p-3 whitespace-nowrap">{formatDDMMYYYY(voucher.submittedAt)}</td>
                    <td className="p-2 sm:p-3">{voucher.samsungSKU.ModelName}</td>
                    <td className="p-2 sm:p-3">{voucher.plan.planType.replace('_', ' ')}</td>
                    <td className="p-2 sm:p-3 font-semibold text-green-600">₹{voucher.incentiveEarned}</td>
                    <td className="p-2 sm:p-3">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-xs">
                        {voucher.voucherCode}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      <div className="mt-6">
        <div className="text-sm font-medium mb-2">Summary</div>
        <div className="grid grid-cols-1 gap-3">
          <GradientCard title="Total Units Sold" value={`${totals.totalUnits}`} color="blue" />
          <GradientCard title="Total Earned Incentive" value={`₹${totals.totalIncentive}`} color="green" />
          {totals.totalDeducted > 0 && (
            <GradientCard title="Total Deducted" value={`₹${totals.totalDeducted}`} color="red" />
          )}
          <GradientCard title="Paid Incentive via Gift Voucher" value={`₹${totals.paid}`} color="purple" />
          <GradientCard 
            title="Net Balance" 
            value={`${totals.net >= 0 ? '' : '-'}₹${Math.abs(totals.net)}`} 
            color={totals.net >= 0 ? "blue" : "red"} 
          />
        </div>
      </div>
    </motion.div>
  )
}

function GradientCard({ title, value, color = 'blue' }: { title: string; value: string; color?: string }) {
  const colorClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-700',
    green: 'bg-gradient-to-r from-green-500 to-green-700',
    red: 'bg-gradient-to-r from-red-500 to-red-700',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-700'
  }
  
  return (
    <div className={`rounded-2xl p-4 text-white shadow-md ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="text-xs opacity-90">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  )
}
