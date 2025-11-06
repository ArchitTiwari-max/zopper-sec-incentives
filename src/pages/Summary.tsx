import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { utils, writeFileXLSX } from 'xlsx'

// Incentive rates inferred from examples: 2*200 + 3*250 = 1150; 1*200 + 2*250 = 700
const ADLD_RATE = 100
const COMBO_RATE = 300

type DayRow = {
  date: string // ISO (YYYY-MM-DD)
  adld: number
  combo: number
}

const dailyData: DayRow[] = [
  { date: '2025-10-15', adld: 2, combo: 3 }, // 5 units, ₹1150
  { date: '2025-10-16', adld: 1, combo: 2 }, // 3 units, ₹700
]

function calcIncentive(adld: number, combo: number) {
  return adld * ADLD_RATE + combo * COMBO_RATE
}

export function SummaryPage() {
  const totals = useMemo(() => {
    const totalUnits = dailyData.reduce((s, r) => s + r.adld + r.combo, 0)
    const totalIncentive = dailyData.reduce((s, r) => s + calcIncentive(r.adld, r.combo), 0)
    const paid = Math.round(totalIncentive * 0.6)
    return { totalUnits, totalIncentive, paid, net: totalIncentive - paid }
  }, [])

  const downloadExcel = () => {
    const rows = dailyData.map((r) => ({
      Date: formatDayMon(r.date),
      'Plan Type (ADLD)': r.adld,
      'Plan Type (Combo)': r.combo,
      'Total Units Sold': r.adld + r.combo,
      'Incentive Earned': calcIncentive(r.adld, r.combo),
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Incentive Summary')
    writeFileXLSX(wb, 'sec-incentive-summary.xlsx')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h2 className="text-lg font-semibold mb-3">Incentive Summary (ADLD & Combo)</h2>

      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Plan Type (ADLD)</th>
              <th className="p-3">Plan Type (Combo)</th>
              <th className="p-3">Total Units Sold</th>
              <th className="p-3">Incentive Earned</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map((r, i) => {
              const total = r.adld + r.combo
              const incentive = calcIncentive(r.adld, r.combo)
              return (
                <tr key={i} className="border-t">
                  <td className="p-3 whitespace-nowrap">{formatDayMon(r.date)}</td>
                  <td className="p-3">{r.adld}</td>
                  <td className="p-3">{r.combo}</td>
                  <td className="p-3">{total}</td>
                  <td className="p-3">₹{incentive.toLocaleString('en-IN')}</td>
                </tr>
              )
            })}
            {dailyData.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={5}>No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        <GradientCard title="Total Units Sold" value={`${totals.totalUnits}`} />
        <GradientCard title="Total Incentive Earned" value={`₹${totals.totalIncentive.toLocaleString('en-IN')}`} />
        <GradientCard title="Paid Incentive via Gift Voucher" value={`₹${totals.paid.toLocaleString('en-IN')}`} />
        <GradientCard title="Incentive to be Paid" value={`₹${totals.net.toLocaleString('en-IN')}`} />
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={downloadExcel} className="button-gradient flex-1 py-3">Download as Excel</button>
        <button onClick={() => alert('Shared!')} className="button-gradient flex-1 py-3">Share Summary</button>
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

function formatDayMon(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
