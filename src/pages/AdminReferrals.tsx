import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'
import { utils, writeFileXLSX } from 'xlsx'

interface Referral {
  id: string
  referrerPhone: string
  refereePhone: string
  status: 'joined' | 'report_submitted' | 'voucher_initiated'
  referrerVoucher?: string | null
  refereeVoucher?: string | null
  createdAt: string
}

export function AdminReferrals() {
  const { auth } = useAuth()
  const [rows, setRows] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | Referral['status']>('all')

  useEffect(() => {
    const run = async () => {
      if (!auth?.token) return
      try {
        setLoading(true)
const r = await authFetch(`${config.apiUrl}/referrals/admin`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
        const j = await r.json()
        if (j.success) { setRows(j.data); setError(null) } else setError(j.message || 'Failed to load referrals')
      } catch (e) {
        setError('Network error. Please try again.')
      } finally { setLoading(false) }
    }
    run()
  }, [auth?.token])

  const exportExcel = () => {
    const data = rows.map(r => ({
      'Referrer Phone': r.referrerPhone,
      'Referee Phone': r.refereePhone,
      'Status': r.status,
      'Created At': new Date(r.createdAt).toLocaleString(),
      'Referrer Voucher': r.referrerVoucher || '',
      'Referee Voucher': r.refereeVoucher || '',
    }))
    const ws = utils.json_to_sheet(data)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Referrals')
    writeFileXLSX(wb, `referrals-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) return <div className="card p-6">Loading referrals…</div>
  if (error) return <div className="card p-6 text-red-600">{error}</div>

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-y-auto">
      <div className="p-4">
        <div className="mb-2">
          <button onClick={() => history.back()} className="px-3 py-1 border rounded-xl text-sm">Back</button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold mb-2">Referrals</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filter:</label>
              <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="px-2 py-1 border rounded-xl text-sm">
                <option value="all">All</option>
                <option value="joined">Joined</option>
                <option value="report_submitted">Report Submitted</option>
                <option value="voucher_initiated">Voucher Initiated</option>
              </select>
            </div>
          </div>
          <button onClick={exportExcel} className="button-gradient px-3 py-2">Export to Excel</button>
        </div>
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Referrer Phone</th>
                <th className="p-2 text-left">Referee Phone</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Referrer Voucher</th>
                <th className="p-2 text-left">Referee Voucher</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter(r => statusFilter==='all' ? true : r.status===statusFilter).map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono">{r.referrerPhone}</td>
                  <td className="p-2 font-mono">{r.refereePhone}</td>
                  <td className="p-2">{formatStatus(r.status)}</td>
                  <td className="p-2 font-mono">{r.referrerVoucher || '—'}</td>
                  <td className="p-2 font-mono">{r.refereeVoucher || '—'}</td>
                  <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={6}>No referrals found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatStatus(s: Referral['status']) {
  if (s === 'joined') return '🟡 Joined'
  if (s === 'report_submitted') return '🔵 Report Submitted'
  return '🟢 Voucher Initiated'
}
