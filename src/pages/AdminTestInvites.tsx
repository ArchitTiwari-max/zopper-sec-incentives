import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '@/lib/config'
import * as XLSX from 'xlsx'
import { FaArrowLeft } from 'react-icons/fa'

interface InviteRow {
  secId: string
  phone: string
  link?: string
  status?: 'idle' | 'signed' | 'sending' | 'sent' | 'error'
  error?: string
}

export function AdminTestInvites() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<InviteRow[]>([{ secId: '', phone: '' }])
  const [expiresHours, setExpiresHours] = useState<number>(72)
  const [bulkText, setBulkText] = useState('')
  const [isBulkSending, setIsBulkSending] = useState(false)

  const canSignAll = useMemo(() => rows.every(r => r.secId && r.phone), [rows])
  const apiUrl = config.apiUrl

  const addRow = () => setRows(prev => [...prev, { secId: '', phone: '' }])
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<InviteRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const parseBulk = () => {
    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const parsed: InviteRow[] = []
    for (const line of lines) {
      const [secId, phone, link] = line.split(/,|\s+/).map(s => s.trim())
      if (secId && phone) parsed.push({ secId, phone, link })
    }
    if (parsed.length) setRows(parsed)
  }

  const importExcel = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

    const normalize = (v: any) => String(v || '').trim()
    const candidates = (row: Record<string, any>, names: string[]) => {
      for (const n of names) {
        const k = Object.keys(row).find(key => key.toLowerCase().replace(/\s+/g, '') === n.toLowerCase().replace(/\s+/g, ''))
        if (k) return normalize(row[k])
      }
      return ''
    }

    const parsed: InviteRow[] = json.map(row => {
      const secId = candidates(row, ['secid', 'sec_id', 'sec id', 'id'])
      const phone = candidates(row, ['phone', 'phone_number', 'mobile', 'whatsapp'])
      const link = candidates(row, ['testlink', 'link', 'url'])
      return { secId, phone, link }
    }).filter(r => r.secId && r.phone)

    if (parsed.length) setRows(parsed)
  }

  const signLink = async (idx: number) => {
    const row = rows[idx]
    if (!row.phone) return
    try {
      updateRow(idx, { status: 'sending', error: undefined })
      const resp = await fetch(`${apiUrl}/tests/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: row.phone, expiresInSeconds: expiresHours * 3600 })
      })
      const j = await resp.json()
      if (!j.success) throw new Error(j.message || 'Failed to sign link')
      updateRow(idx, { link: j.link, status: 'signed' })
    } catch (e: any) {
      updateRow(idx, { status: 'error', error: e?.message || 'Error' })
    }
  }

  const copyLink = async (idx: number) => {
    const link = rows[idx].link
    if (!link) return
    await navigator.clipboard.writeText(link)
    updateRow(idx, { status: 'signed' })
  }

  const sendInvite = async (idx: number) => {
    const row = rows[idx]
    if (!row.phone) return
    try {
      updateRow(idx, { status: 'sending', error: undefined })
      const resp = await fetch(`${apiUrl}/tests/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: row.phone, secId: row.secId, expiresInSeconds: expiresHours * 3600 })
      })
      const j = await resp.json()
      if (!j.success) throw new Error(j.message || 'Failed to send invite')
      updateRow(idx, { link: j.link, status: 'sent' })
    } catch (e: any) {
      updateRow(idx, { status: 'error', error: e?.message || 'Error' })
    }
  }

  const sendBulk = async () => {
    setIsBulkSending(true)
    try {
      const invites = rows.filter(r => r.phone).map(r => ({ secId: r.secId, phone: r.phone }))
      const resp = await fetch(`${apiUrl}/tests/invite-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invites, expiresInSeconds: expiresHours * 3600 })
      })
      const j = await resp.json()
      if (!j.success) throw new Error(j.message || 'Bulk invite failed')
      // Update statuses
      const next = [...rows]
      for (const r of j.results as any[]) {
        const idx = next.findIndex(x => x.secId === r.secId && x.phone === r.phone)
        if (idx >= 0) next[idx] = { ...next[idx], link: r.link, status: r.success ? 'sent' : 'error', error: r.message }
      }
      setRows(next)
    } catch (e) {
      // noop; per-row errors are captured
    } finally {
      setIsBulkSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Test Invites</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Expiry (hours)</label>
          <input type="number" min={1} className="w-24 border rounded px-2 py-1" value={expiresHours} onChange={e => setExpiresHours(Number(e.target.value))} />
          <button onClick={sendBulk} disabled={isBulkSending || rows.every(r => r.status === 'sent')} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {isBulkSending ? 'Sending...' : 'Send All'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f) }}
              className="border rounded px-3 py-2"
            />
            <span className="text-xs text-gray-500">Columns supported: SEC_ID, PHONE, optional TEST_LINK</span>
          </div>
          <div className="flex gap-2">
            <textarea className="flex-1 border rounded p-2 min-h-[80px]" placeholder="Bulk paste: SEC_ID,PHONE[,TEST_LINK] one per line" value={bulkText} onChange={e => setBulkText(e.target.value)} />
            <div className="flex flex-col gap-2">
              <button onClick={parseBulk} className="px-3 py-2 bg-gray-800 text-white rounded">Parse</button>
              <button onClick={() => setRows([{ secId: '', phone: '' }])} className="px-3 py-2 bg-gray-200 rounded">Clear</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">SEC ID</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Link</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">
                    <input className="border rounded px-2 py-1 w-40" placeholder="ABC123" value={r.secId} onChange={e => updateRow(idx, { secId: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="border rounded px-2 py-1 w-40" placeholder="91XXXXXXXXXX or 10-digit" value={r.phone} onChange={e => updateRow(idx, { phone: e.target.value })} />
                  </td>
                  <td className="px-3 py-2 text-blue-600 max-w-[320px] truncate" title={r.link}>{r.link || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => signLink(idx)} className="px-3 py-1 bg-gray-100 rounded">{r.link ? 'Re-sign' : 'Sign Link'}</button>
                      <button onClick={() => copyLink(idx)} disabled={!r.link} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Copy</button>
                      <button onClick={() => sendInvite(idx)} disabled={!r.secId || !r.phone || r.status === 'sending'} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">{r.status === 'sending' ? 'Sending...' : 'Send'}</button>
                      <button onClick={() => removeRow(idx)} className="px-3 py-1 bg-red-100 text-red-700 rounded">Remove</button>
                    </div>
                    {r.status === 'error' && (
                      <div className="text-xs text-red-600 mt-1">{r.error}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button onClick={addRow} className="px-4 py-2 bg-gray-200 rounded">+ Add Row</button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Tips: For signed links and WhatsApp sending, configure environment variables: LINK_SIGNING_SECRET and either COMIFY_* or WHATSAPP_*.
      </div>
    </div>
  )
}
