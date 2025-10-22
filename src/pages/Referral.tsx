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

  const referredBy = useMemo(() => rows.filter(r => r.role === 'referee').sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)), [rows])
  const referredTo = useMemo(() => rows.filter(r => r.role === 'referrer').sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)), [rows])

  const statusPill = (s: ReferralRow['status']) => {
    if (s === 'joined') return <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">🟡 Joined</span>
    if (s === 'report_submitted') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">🔵 Reward will be initiated soon</span>
    return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">🟢 Voucher Initiated</span>
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="text-lg font-semibold mb-2 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="mr-2 px-3 py-1 border rounded-xl text-sm">Back</button>
          Refer a friend
          <FaInfoCircle className="text-gray-500" title="Invite a friend and earn ₹100 voucher" />
        </div>
        <div className="text-2xl font-bold mb-1">Share your code</div>
        <div className="text-gray-600 mb-3">Invite a friend and earn ₹100 vocuher</div>
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-xl border bg-white">
            <div className="text-sm text-gray-600 mb-2">Your Referral Link</div>
            <div className="flex gap-2 items-center">
              <input readOnly value={referralLink} className="flex-1 px-3 py-3 border rounded-2xl bg-gray-50 font-mono text-sm text-center" />
              <button 
                onClick={() => copy(referralLink)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors flex items-center gap-2"
                title="Copy link"
              >
                <FaCopy />
              </button>
            </div>
          </div>
          <button className="px-3 py-3 rounded-2xl bg-black text-white" onClick={() => {
            const text = encodeURIComponent(`👋 Hey Dost!\nJoin karo SalesDost Spot Incentive Program aur kamao incentive Samsung Protect Max plan bechne par! 💰\n\n🎁 Apna referral link share karo Croma ya Vijay Sales ke doosre SECs ke saath —\nUnke pehle valid report par ₹100 voucher milega dono ko! 🔥\n\nJaldi karo, link bhejo aur milke sales badhao 👇\n🔗 ${referralLink}`)
            
            // Try to open WhatsApp app first using whatsapp:// protocol
            const whatsappUrl = `whatsapp://send?text=${text}`
            const webUrl = `https://web.whatsapp.com/send?text=${text}`
            
            // Create a hidden iframe to test if WhatsApp app is available
            const iframe = document.createElement('iframe')
            iframe.style.display = 'none'
            document.body.appendChild(iframe)
            
            try {
              iframe.src = whatsappUrl
              // If app doesn't open within 1.5s, fallback to web
              setTimeout(() => {
                if (document.hasFocus()) {
                  window.open(webUrl, '_blank')
                }
                document.body.removeChild(iframe)
              }, 1500)
            } catch {
              window.open(webUrl, '_blank')
              document.body.removeChild(iframe)
            }
          }}>Share your code</button>
          <div className="text-gray-700 text-sm">You can earn ₹100 voucher for each friend who joins and submits their first plan sale.</div>
          <div className="flex items-center justify-center mt-2">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-yellow-400 flex items-center justify-center text-5xl font-bold text-black">Z</div>
              <div className="absolute -top-2 -left-2 w-2 h-2 bg-yellow-400 rounded-full"></div>
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-yellow-400 rounded-full"></div>
              <div className="absolute -bottom-2 -left-3 w-2 h-2 bg-yellow-400 rounded-full"></div>
              <div className="absolute -bottom-3 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
            </div>
          </div>
        </div>
        {msg && <div className="text-green-600 text-sm mt-2">{msg}</div>}
      </div>

      {/* When someone referred you */}
      {referredBy.length > 0 && (
        <div className="mb-6">
          <div className="p-4 rounded-xl border bg-white">
            <div className="mb-2">🎉 You joined using referral by <span className="font-mono font-semibold">{referredBy[0].referrerPhone}</span>!</div>
            {referredBy[0].status === 'joined' && (
              <div className="text-sm text-gray-600 mb-4">Submit your first sales report to unlock rewards for both of you.</div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Referred By</div>
                <div className="font-mono">{referredBy[0].referrerPhone}</div>
              </div>
              <div>
                <div className="text-gray-500">Your Status</div>
                <div>{statusPill(referredBy[0].status)}</div>
              </div>
              {referredBy[0].status === 'joined' && (
                <>
                  <div>
                    <div className="text-gray-500">Next Step</div>
                    <div>Submit your first sales report</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Your Reward</div>
                    <div>₹100 voucher after first report</div>
                  </div>
                </>
              )}
              {referredBy[0].status !== 'joined' && (
                <div className="col-span-2">
                  <div className="text-gray-500 mb-1">Voucher Code</div>
                  {referredBy[0].voucher ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="font-mono font-semibold text-green-900 text-lg">{referredBy[0].voucher}</div>
                    </div>
                  ) : (
                    <div className="text-yellow-600 font-medium">Pending</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When you referred someone */}
      {referredTo.length > 0 && (
        <div className="bg-white rounded-xl shadow">
          <div className="p-3 border-b font-semibold">Your Referrals</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Referee Phone</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Voucher Code</th>
                </tr>
              </thead>
              <tbody>
                {referredTo.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono">{r.refereePhone}</td>
                    <td className="p-2">{statusPill(r.status)}</td>
                    <td className="p-2">
                      {r.voucher ? (
                        <span className="bg-green-50 border border-green-200 rounded-lg px-2 py-1 font-mono font-semibold text-green-900">{r.voucher}</span>
                      ) : r.status === 'voucher_initiated' ? (
                        <span className="text-blue-600">Processing...</span>
                      ) : r.status === 'report_submitted' ? (
                        <span className="text-yellow-600">Pending</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-700">How referrals work</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Share your referral link with another SEC.</li>
          <li>They must open the link and log in; this records a referral with status “joined”.</li>
          <li className="text-rose-600">Referrals apply only for new users who haven’t logged in or submitted a plan sale before.</li>
          <li>When the referee submits their first valid report, status becomes “Reward will be initiated soon.” The reward is a ₹100 voucher.</li>
          <li>Once a voucher is issued, the status shows the voucher code. You’ll only see your own voucher side.</li>
        </ol>
      </div>
    </div>
  )
}
