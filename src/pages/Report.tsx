import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

interface Row {
  date: string // ISO
  plan: 'Silver' | 'Gold' | 'Platinum'
  price: number
  units: number
  incentive: number
}

const rowsSeed: Row[] = [
  { date: '2025-10-15', plan: 'Gold', price: 999, units: 12, incentive: 2400 },
  { date: '2025-10-12', plan: 'Silver', price: 499, units: 7, incentive: 700 },
  { date: '2025-10-10', plan: 'Platinum', price: 1499, units: 3, incentive: 900 },
  { date: '2025-10-01', plan: 'Gold', price: 999, units: 5, incentive: 1000 },
]

function formatDayMonYear(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReportPage() {
  const [planFilter, setPlanFilter] = useState<string>('')
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const plans = ['Silver', 'Gold', 'Platinum'] as const

  const filtered = useMemo(() => {
    const byPlan = (r: Row) => (!planFilter || r.plan === planFilter)
    const byQuery = (r: Row) => {
      const text = `${r.plan} ${r.price}`.toLowerCase()
      return !q || text.includes(q.toLowerCase())
    }
    const sorted = [...rowsSeed].sort((a, b) => (sortDesc ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)))
    return sorted.filter(r => byPlan(r) && byQuery(r))
  }, [planFilter, q, sortDesc])

  const totals = useMemo(() => {
    const totalUnits = filtered.reduce((s, r) => s + r.units, 0)
    const totalIncentive = filtered.reduce((s, r) => s + r.incentive, 0)
    const paid = Math.round(totalIncentive * 0.6)
    return { totalUnits, totalIncentive, paid, net: totalIncentive - paid }
  }, [filtered])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card scroll-smooth">
      <h2 className="text-lg font-semibold">Your Plan Sales</h2>

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input
          className="flex-1 px-3 py-2 border rounded-2xl"
          placeholder="Search Plan (e.g., Gold 999)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="px-3 py-2 border rounded-2xl" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          {plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => setSortDesc(s => !s)} className="button-gradient px-4 py-2">Sort by Date {sortDesc ? '↓' : '↑'}</button>
      </div>

      <div className="mt-3 overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Plan Type</th>
              <th className="p-3">Total Units Sold</th>
              <th className="p-3">Incentive Earned</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{formatDayMonYear(r.date)}</td>
                <td className="p-3">{`${r.plan} ${r.price}`}</td>
                <td className="p-3">{r.units}</td>
                <td className="p-3">₹{r.incentive.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={4}>No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        <GradientCard title="Total Units Sold" value={`${totals.totalUnits}`} />
        <GradientCard title="Total Incentive Earned" value={`₹${totals.totalIncentive}`} />
        <GradientCard title="Incentive Paid (Gift Voucher)" value={`₹${totals.paid}`} />
        <GradientCard title="Net Available Incentive" value={`₹${totals.net}`} />
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
