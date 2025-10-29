import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Confetti } from '@/components/Confetti'
import { ZopperLogo } from '@/components/ZopperLogo'

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
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-4 py-12">
    {isPassed && <Confetti />}
    <div className="max-w-4xl mx-auto">
      {/* Certificate Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-12 mb-6 relative overflow-hidden border-8 border-double border-[#0B2C5F]">
        {/* Decorative Corner Ornaments */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-blue-200 rounded-tl-2xl"></div>
        <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-blue-200 rounded-tr-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-blue-200 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-blue-200 rounded-br-2xl"></div>

        {/* Logo */}
        <div className="text-center mb-8">
          <ZopperLogo className="text-3xl" />
        </div>

        {/* Certificate Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#0B2C5F] mb-2 leading-tight">
            Certificate of Achievement
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent mx-auto"></div>
        </div>

        {/* Recipient */}
        <div className="text-center mb-10">
          <p className="text-gray-600 text-sm uppercase tracking-widest mb-2">This is to certify that</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            {result.secDetails?.name || result.phone}
          </h2>
          {result.secDetails?.store?.storeName && (
            <p className="text-gray-600 text-sm">
              {result.secDetails.store.storeName}
              {result.secDetails.store.city ? `, ${result.secDetails.store.city}` : ''}
            </p>
          )}
        </div>

        {/* Achievement Statement */}
        <div className="text-center mb-8">
          <p className="text-gray-700 text-lg leading-relaxed">
            has successfully completed the assessment with a score of
          </p>
        </div>

        {/* Score Badge */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl">
              <div className="w-36 h-36 rounded-full bg-white flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-blue-600">
                  {result.score}%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {correctCount}/{result.totalQuestions} correct
                </div>
              </div>
            </div>
            {isPassed && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                ✓ PASSED
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pass Mark</p>
            <p className="text-lg font-semibold text-gray-900">60%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time Taken</p>
            <p className="text-lg font-semibold text-gray-900">
              {Math.floor(result.completionTime / 60)}m {result.completionTime % 60}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(result.submittedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Certificate ID */}
        <div className="text-center text-xs text-gray-500 mb-6">
          <p>Certificate ID: {result.secDetails?.secId || result.phone.slice(-9)}</p>
        </div>

        {/* Motivational Footer */}
        <div className="text-center border-t border-gray-200 pt-6">
          <p className="text-sm italic text-gray-600">
            {isPassed 
              ? '"Excellence is not a destination, it is a continuous journey."'
              : '"Every expert was once a beginner. Keep learning and growing!"'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/plan-sell-info')}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Print Certificate
        </button>
        <button
          onClick={() => navigate('/results')}
          className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          View All Results
        </button>
      </div>
    </div>
  </div>
)
}
