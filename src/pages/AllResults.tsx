import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTestSubmissions, TestSubmission } from '@/lib/testData'

export function AllResults() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<TestSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        console.log('🎯 AllResults: Starting to fetch submissions...')
        setLoading(true)
        const data = await getTestSubmissions()
        console.log('🎯 AllResults: Received data:', data)
        console.log('🎯 AllResults: Data length:', data.length)
        setSubmissions(data)
        setError(null)
      } catch (err) {
        console.error('🎯 AllResults: Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [])

  const allResults = useMemo(() => {
    return [...submissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [submissions])

  const Card = ({ s }: { s: TestSubmission }) => (
    <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">SEC ID</div>
          <div className="font-semibold text-gray-900">{s.secId}</div>
        </div>
        <div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.score >= 60 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {s.score}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        <span className="mr-2">Answered: {s.responses.length}/{s.totalQuestions}</span>
        <span>Time: {Math.floor(s.completionTime/60)}m {s.completionTime%60}s</span>
      </div>
      <div className="mt-1 text-xs text-gray-500">Submitted: {new Date(s.submittedAt).toLocaleString()}</div>
      {s.isProctoringFlagged && (
        <div className="mt-2 text-xs inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800">⚠️ Proctoring flagged</div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">All Test Results</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => navigate('/plan-sell-info')}>Dashboard</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-20 bg-white rounded-lg shadow">
            <div className="text-4xl mb-2">⏳</div>
            <p>Loading test results...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-20 bg-white rounded-lg shadow">
            <div className="text-4xl mb-2">❌</div>
            <p>Error: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center text-gray-600 py-20 bg-white rounded-lg shadow">
            <div className="text-4xl mb-2">📄</div>
            <p>No results yet. Complete a test to see it here.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">All Results</h2>
              <span className="text-sm text-gray-500">{allResults.length}</span>
            </div>
            <div className="space-y-3">
              {allResults.map(s => <Card key={s.secId + s.submittedAt} s={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}