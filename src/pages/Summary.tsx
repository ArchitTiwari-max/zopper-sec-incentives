import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { utils, writeFileXLSX } from 'xlsx'

const mockData = [
  { date: '2025-10-01', plan: 'Silver', units: 3, incentive: 297 },
  { date: '2025-10-05', plan: 'Gold', units: 2, incentive: 398 },
  { date: '2025-10-08', plan: 'Platinum', units: 1, incentive: 299 },
]

export function SummaryPage() {
  const totals = useMemo(() => {
    const totalIncentive = mockData.reduce((s, r) => s + r.incentive, 0)
    const paid = Math.round(totalIncentive * 0.6)
    return { totalIncentive, paid, net: totalIncentive - paid }
  }, [])

  const downloadExcel = () => {
    const ws = utils.json_to_sheet(mockData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Summary')
    writeFileXLSX(wb, 'incentive-summary.xlsx')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h2 className="text-lg font-semibold mb-3">Your Incentive Summary</h2>

      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Plan Type</th>
              <th className="p-3">Total Units</th>
              <th className="p-3">Incentive Earned</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{formatDateOnly(r.date)}</td>
                <td className="p-3">{r.plan}</td>
                <td className="p-3">{r.units}</td>
                <td className="p-3">₹{r.incentive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        <GradientCard title="Total Incentive Earned" value={`₹${totals.totalIncentive}`} />
        <GradientCard title="Incentive Paid (Gift Voucher)" value={`₹${totals.paid}`} />
        <GradientCard title="Net Available Incentive" value={`₹${totals.net}`} />
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

function formatDateOnly(s: string) {
  // Accepts 'YYYY-MM-DD'; returns 'dd mm yyyy'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd} ${mm} ${yyyy}`
}
