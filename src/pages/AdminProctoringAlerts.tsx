import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { config } from '@/lib/config'
import { FaArrowLeft } from 'react-icons/fa'

export function AdminProctoringAlerts() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState<any[]>([])
  const [secId, setSecId] = useState(searchParams.get('secId') || '')
  const [score, setScore] = useState<number | null>(null)

  const load = async () => {
    const url = secId ? `${config.apiUrl}/proctoring/events?secId=${encodeURIComponent(secId)}` : `${config.apiUrl}/proctoring/events`
    const res = await fetch(url)
    const j = await res.json()
    setEvents(j.data || [])
    if (secId) {
      const s = await fetch(`${config.apiUrl}/proctoring/score?secId=${encodeURIComponent(secId)}`)
      const sj = await s.json()
      setScore(sj.score ?? null)
    } else setScore(null)
  }

  useEffect(() => { load() }, [secId])

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const e of events) {
      const k = e.secId
      if (!map.get(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return Array.from(map.entries())
  }, [events])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/admin/test-results')}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FaArrowLeft size={16} />
          Back to Test Results
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Proctoring Alerts</h1>
      </div>
      <div className="flex items-center gap-2">
        <input className="border rounded px-3 py-2" placeholder="Filter by SEC ID" value={secId} onChange={e => setSecId(e.target.value)} />
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={load}>Refresh</button>
        {score !== null && (
          <div className="ml-2 text-sm">Integrity Score: <span className={`font-semibold ${score < 60 ? 'text-red-600' : score < 80 ? 'text-yellow-600' : 'text-green-600'}`}>{score}</span></div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="text-gray-500">No proctoring events.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([k, list]) => (
            <div key={k} className="bg-white rounded shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">SEC ID: {k}</div>
                <div className="text-xs text-gray-500">{list.length} events</div>
              </div>
              <div className="text-sm grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                {list.sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).map((e,i)=> (
                  <div key={i} className="flex items-center justify-between">
                    <div className="font-mono text-xs">{new Date(e.createdAt).toLocaleString()}</div>
                    <div className="px-2 py-0.5 rounded text-xs bg-gray-100">{e.eventType}</div>
                    <div className="text-xs text-gray-600 truncate max-w-[40ch]" title={e.details}>{e.details}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
