import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

// New day-wise data structure matching the sheet: columns ADLD and Combo
interface DayRow {
  date: string // ISO
  adld: number
  combo: number
}

const rowsSeed: DayRow[] = [
  { date: '2025-10-15', adld: 2, combo: 3 }, // 5 units, 1150
  { date: '2025-10-16', adld: 1, combo: 2 }, // 3 units, 700
]

function formatDayMonYear(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ADLD_RATE = 200
const COMBO_RATE = 250
const calcIncentive = (r: DayRow) => r.adld * ADLD_RATE + r.combo * COMBO_RATE

export function ReportPage() {
  // Keep filters: search and sort toggle (no plan filter)
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const filtered = useMemo(() => {
    const byQuery = (r: DayRow) => {
      const text = `${formatDayMonYear(r.date)} ${r.adld} ${r.combo}`.toLowerCase()
      return !q || text.includes(q.toLowerCase())
    }
    const sorted = [...rowsSeed].sort((a, b) =>
      sortDesc ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)
    )
    return sorted.filter(byQuery)
  }, [q, sortDesc])

  const totals = useMemo(() => {
    const totalUnits = filtered.reduce((s, r) => s + r.adld + r.combo, 0)
    const totalIncentive = filtered.reduce((s, r) => s + calcIncentive(r), 0)
    const paid = Math.min(1000, totalIncentive)
    return { totalUnits, totalIncentive, paid, net: totalIncentive - paid }
  }, [filtered])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card scroll-smooth">
      <h2 className="text-lg font-semibold">Reporting</h2>

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input
          className="flex-1 px-3 py-2 border rounded-2xl"
          placeholder="Search (e.g., 15 Oct)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setSortDesc(s => !s)} className="button-gradient px-4 py-2">Sort by Date {sortDesc ? '↓' : '↑'}</button>
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
        <div className="text-sm font-medium mb-2">Payout</div>
        <div className="grid grid-cols-1 gap-3">
          <GradientCard title="Total Units Sold" value={`${totals.totalUnits}`} />
          <GradientCard title="Total Incentive Earned" value={`₹${totals.totalIncentive}`} />
          <GradientCard title="Incentive Paid (Gift Voucher)" value={`₹${totals.paid}`} />
          <GradientCard title="Net Available Incentive" value={`₹${totals.net}`} />
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
