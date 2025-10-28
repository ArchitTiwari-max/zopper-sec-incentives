import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ResultData {
  phone: string
  score: number
  totalQuestions: number
  responses: Array<{
    questionId: number
    selectedAnswer: string
    answeredAt: string
  }>
  submittedAt: string
  completionTime: number
  secDetails?: {
    name?: string | null
    secId?: string | null
    store?: { storeName: string; city?: string | null } | null
  }
}

export function TestResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const [result, setResult] = useState<ResultData | null>(null)

  useEffect(() => {
    // Get result from location state or localStorage
    if (location.state?.result) {
      setResult(location.state.result)
    } else {
      // Try to load from localStorage as fallback
      const stored = localStorage.getItem('last_test_result')
      if (stored) {
        try {
          setResult(JSON.parse(stored))
        } catch {
          navigate('/plan-sell-info')
        }
      } else {
        navigate('/plan-sell-info')
      }
    }
  }, [location, navigate])

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  const isPassed = result.score >= 60
  const correctCount = Math.round((result.score / 100) * result.totalQuestions)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className={`text-5xl mb-3 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
              {isPassed ? '✅' : '❌'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isPassed ? 'Test Passed!' : 'Test Completed'}
            </h1>
            <p className="text-gray-600">
              {isPassed 
                ? 'Congratulations! You have successfully passed the assessment.'
                : 'Thank you for completing the test.'}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {result.score}%
              </div>
              <div className="text-gray-700 text-lg mb-3">
                {correctCount} out of {result.totalQuestions} correct
              </div>
              <div className="flex justify-center gap-8 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">Pass Mark:</span> 60%
                </div>
                <div>
                  <span className="font-semibold">Time:</span> {Math.floor(result.completionTime / 60)}m {result.completionTime % 60}s
                </div>
              </div>
            </div>
          </div>

          {/* SEC Details */}
          <div className="border-t pt-6 text-center text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">SEC:</span>{' '}
              {result.secDetails?.name 
                ? `${result.secDetails.name} (${result.phone})`
                : result.phone}
            </p>
            {result.secDetails?.store?.storeName && (
              <p>
                <span className="font-semibold">Store:</span>{' '}
                {result.secDetails.store.storeName}
                {result.secDetails.store.city ? `, ${result.secDetails.store.city}` : ''}
              </p>
            )}
            <p>
              <span className="font-semibold">Submitted:</span>{' '}
              {new Date(result.submittedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/plan-sell-info')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Print Results
          </button>
        </div>
      </div>
    </div>
  )
}
