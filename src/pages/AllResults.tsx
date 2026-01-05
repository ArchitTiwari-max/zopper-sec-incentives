import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTestSubmissions, TestSubmission } from '@/lib/testData'
import { useAuth } from '@/contexts/AuthContext'
import { isSECUser } from '@/lib/auth'

export function AllResults() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [submissions, setSubmissions] = useState<TestSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        console.log('🎯 AllResults: Starting to fetch user submissions...')
        console.log('🎯 AllResults: Auth state:', auth)
        setLoading(true)

        // Get the logged-in user's phone number to filter their results
        let userPhone: string | undefined
        if (auth?.user && isSECUser(auth.user)) {
          userPhone = auth.user.phone
          console.log('🎯 AllResults: Filtering by phone number:', userPhone)
        } else {
          console.log('🎯 AllResults: No SEC user found, cannot show personal results')
          setError('Please log in to view your test results')
          setLoading(false)
          return
        }

        // Fetch all submissions and filter by phone number
        const allData = await getTestSubmissions()
        console.log('🎯 AllResults: Received all data:', allData.length, 'submissions')

        // Filter by phone number (check both phone field and secId field for phone numbers)
        const userSubmissions = allData.filter(submission => {
          return submission.phone === userPhone ||
            submission.secId === userPhone ||
            (submission.phone && submission.phone === userPhone)
        })

        console.log('🎯 AllResults: User submissions for phone', userPhone, ':', userSubmissions.length)
        setSubmissions(userSubmissions)
        setError(null)
      } catch (err) {
        console.error('🎯 AllResults: Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load your test results')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
  }, [auth])

  const allResults = useMemo(() => {
    return [...submissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [submissions])

  // Helper function to get display name with priority: name > secId > phone
  const getDisplayName = (submission: TestSubmission) => {
    // Priority 1: If there's a user name field, use it
    if (submission.name && submission.name.trim()) {
      return submission.name
    }

    // Priority 2: If secId exists and is not a phone number, use it
    if (submission.secId && !/^\d{10,}$/.test(submission.secId)) {
      return submission.secId
    }

    // Priority 3: Use phone number
    return submission.phone || submission.secId || 'Unknown User'
  }

  const Card = ({ s }: { s: TestSubmission }) => (
    <div
      className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer hover:scale-[1.01]"
      onClick={() => s.id ? navigate(`/test-details/${s.id}`) : navigate('/test-details', { state: { submission: s } })}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Test Attempt</div>
          <div className="font-semibold text-gray-900">
            {new Date(s.submittedAt).toLocaleDateString()} at {new Date(s.submittedAt).toLocaleTimeString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            By: {getDisplayName(s)}
          </div>
          {s.storeCity && (
            <div className="text-xs text-gray-400">{s.storeCity}</div>
          )}
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.score >= 60 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {s.score}%
          </span>
          <div className="text-xs text-gray-500 mt-1">
            {s.score >= 60 ? 'PASSED' : 'FAILED'}
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600">
        <span className="mr-4">📝 {s.responses.length}/{s.totalQuestions} questions</span>
        <span className="mr-4">⏱️ {Math.floor(s.completionTime / 60)}m {s.completionTime % 60}s</span>
        {s.isProctoringFlagged && (
          <span className="text-orange-600">⚠️ Flagged</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Test Results</h1>
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
            <p>You haven't completed any tests yet.</p>
            <button
              onClick={() => navigate('/test')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Take a Test
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Your Test History</h2>
              <span className="text-sm text-gray-500">{allResults.length} test{allResults.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {allResults.map((s, i) => <Card key={s.id || `${s.secId}-${s.submittedAt}-${i}`} s={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}