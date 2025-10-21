import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaCopy, FaLink, FaInfoCircle } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'

interface ReferralRow {
  id: string
  referrerPhone: string
  refereePhone: string
  status: 'joined' | 'report_submitted' | 'voucher_initiated'
  voucher?: string | null
  role: 'referrer' | 'referee'
  createdAt: string
}

export function ReferralPage() {
  const { user, auth } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const phone = (user as any)?.phone || ''
  const referralCode = phone
  const siteBase = typeof window !== 'undefined' ? window.location.origin : 'https://www.salesdost.com'
  const referralLink = `${siteBase}/?referal_code=${referralCode}`

  const [rows, setRows] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    // If page opened with ?referal=CODE and user is logged in, join
    const params = new URLSearchParams(location.search)
    const code = params.get('referal_code') || params.get('referal')
    if (auth?.token && code && /^\d{10}$/.test(code) && code !== referralCode) {
      fetch(`${config.apiUrl}/referrals/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ referralCode: code })
      }).catch(()=>{})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, auth?.token])

  const fetchRows = async () => {
    if (!auth?.token) return
    try {
      setLoading(true)
      const r = await fetch(`${config.apiUrl}/referrals/me`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      const j = await r.json()
      if (j.success) setRows(j.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRows() }, [auth?.token])

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMsg('Copied!') } finally { setTimeout(()=>setMsg(null), 1500) }
  }

  const table = useMemo(() => rows.map(r => ({
    code: r.referrerPhone,
    referee: r.refereePhone,
    amount: '—',
    statusText: r.status === 'joined' ? 'Joined' : r.status === 'report_submitted' ? 'Reward will be initiated soon.' : (r.voucher ? `Voucher: ${r.voucher}` : 'Voucher initiated'),
    key: r.id
  })), [rows])

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="text-lg font-semibold mb-2 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="mr-2 px-3 py-1 border rounded-xl text-sm">Back</button>
          Referral Program
          <FaInfoCircle className="text-gray-500" title="Share this with other SECs. When they join via your code, you'll see them below." />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 p-2 border rounded-xl flex-1">
            <span className="text-sm text-gray-600">Referral Link:</span>
            <span className="truncate">{referralLink}</span>
            <button className="px-2 py-1 text-sm bg-gray-100 rounded-lg" onClick={() => copy(referralLink)}><FaLink /> Copy Link</button>
            {'share' in navigator ? (
              <button className="px-2 py-1 text-sm bg-blue-600 text-white rounded-lg" onClick={async ()=>{
                try { // @ts-ignore
                  await navigator.share({ title: 'My SalesDost referral', text: 'Join via my referral', url: referralLink })
                } catch {}
              }}>Share</button>
            ) : null}
          </div>
        </div>
        {msg && <div className="text-green-600 text-sm mt-1">{msg}</div>}
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="p-3 border-b font-semibold">Your Referrals</div>
        {loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Referral Code</th>
                  <th className="p-2 text-left">Referee Phone</th>
                  <th className="p-2 text-left">Referral Amount</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {table.map(row => (
                  <tr key={row.key} className="border-t">
                    <td className="p-2 font-mono">{row.code}</td>
                    <td className="p-2 font-mono">{row.referee}</td>
                    <td className="p-2">{row.amount}</td>
                    <td className="p-2">{row.statusText}</td>
                  </tr>
                ))}
                {table.length === 0 && (
                  <tr><td className="p-4 text-center text-gray-500" colSpan={4}>No referrals yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-700">How referrals work</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Share your referral link with another SEC.</li>
          <li>They must open the link and log in; this records a referral with status “joined”.</li>
          <li className="text-rose-600">Referrals apply only for new users who haven’t logged in or submitted a report before.</li>
          <li>When the referee submits their first valid report, status becomes “Reward will be initiated soon.”</li>
          <li>Once a voucher is issued, the status shows the voucher code. You’ll only see your own voucher side.</li>
        </ol>
      </div>
    </div>
  )
}
