import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { QuestionCard } from '@/components/QuestionCard'
import { TestTimer } from '@/components/TestTimer'
import { ProctoringPanel } from '@/components/ProctoringPanel'
import { 
  extractPhoneFromUrl, 
  validateTestToken, 
  createTestSession, 
  saveTestSession, 
  endTestSession 
} from '@/lib/testToken'
import { config } from '@/lib/config'
import { 
  sampleQuestions, 
  TestResponse, 
  saveTestSubmission, 
  calculateScore 
} from '@/lib/testData'

// Test configuration
const TEST_DURATION = 15 * 60 // 15 minutes in seconds
const TOTAL_QUESTIONS = sampleQuestions.length

interface TestState {
  isVerifying: boolean
  isValidToken: boolean
  phone: string | null
  currentQuestionIndex: number
  responses: TestResponse[]
  startTime: string
  isCompleted: boolean
  isSubmitting: boolean
  score?: number
  timeUp: boolean
}

interface SecDetails {
  phone: string
  secId?: string | null
  name?: string | null
  store?: { storeName: string; city?: string | null } | null
}

export function TestPage() {
  const navigate = useNavigate()
  const [testState, setTestState] = useState<TestState>({
    isVerifying: true,
    isValidToken: false,
    phone: null,
    currentQuestionIndex: 0,
    responses: [],
    startTime: '',
    isCompleted: false,
    isSubmitting: false,
    timeUp: false
  })
  const [secDetails, setSecDetails] = useState<SecDetails | null>(null)

  // Initialize test on component mount
  useEffect(() => {
    const init = async () => {
      const phone = extractPhoneFromUrl()
      if (!phone) {
        setTestState(prev => ({ ...prev, isValidToken: false, isVerifying: false }))
        return
      }
      const ok = await validateTestToken(phone)
      if (!ok) {
        setTestState(prev => ({ ...prev, isValidToken: false, isVerifying: false }))
        return
      }

      // Create and save test session
      const session = createTestSession(phone)
      saveTestSession(session)

      // Fetch SEC details by phone (non-blocking)
      try {
        const resp = await fetch(`${config.apiUrl}/sec/by-phone?phone=${encodeURIComponent(phone)}`)
        const j = await resp.json()
        if (j?.success && j?.data) setSecDetails(j.data)
      } catch {}

      setTestState(prev => ({
        ...prev,
        isValidToken: true,
        phone,
        startTime: new Date().toISOString(),
        isVerifying: false
      }))
    }
    init()
    // Ensure we clear verifying state even if something hangs
    const fallback = setTimeout(() => setTestState(prev => ({ ...prev, isVerifying: false })), 3000)
    return () => clearTimeout(fallback)

    // Prevent back navigation and page refresh
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault()
      window.history.pushState(null, '', window.location.href)
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.history.pushState(null, '', window.location.href)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Handle answer submission
  const handleAnswerSubmit = useCallback((selectedAnswer: string) => {
    if (testState.isCompleted || testState.isSubmitting) return

    const currentQuestion = sampleQuestions[testState.currentQuestionIndex]
    const response: TestResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      answeredAt: new Date().toISOString()
    }

    setTestState(prev => {
      const newResponses = [...prev.responses, response]
      const isLastQuestion = prev.currentQuestionIndex === TOTAL_QUESTIONS - 1

      if (isLastQuestion) {
        // Submit test
        submitTest(newResponses, prev.startTime)
        return {
          ...prev,
          responses: newResponses,
          isCompleted: true,
          isSubmitting: true
        }
      }

      return {
        ...prev,
        responses: newResponses,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }
    })
  }, [testState.currentQuestionIndex, testState.isCompleted, testState.isSubmitting, testState.startTime])

  // Handle time up
  const handleTimeUp = useCallback(() => {
    if (testState.isCompleted) return

    setTestState(prev => {
      submitTest(prev.responses, prev.startTime)
      return {
        ...prev,
        isCompleted: true,
        isSubmitting: true,
        timeUp: true
      }
    })
  }, [testState.isCompleted, testState.responses, testState.startTime])

  // Submit test function
  const submitTest = async (responses: TestResponse[], startTime: string) => {
    const identifier = (secDetails?.secId && secDetails.secId.trim()) || testState.phone
    const score = calculateScore(responses, sampleQuestions)
    const completionTime = Math.floor((Date.now() - new Date(startTime || new Date().toISOString()).getTime()) / 1000)

    try {
      if (!identifier) throw new Error('Missing identifier')

      const submission = {
        secId: identifier,
        sessionToken: 'test-token', // In production, get from session
        responses,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        submittedAt: new Date().toISOString(),
        completionTime,
        isProctoringFlagged: true // set if any alerts occurred (panel marks via logs)
      }

      try {
        saveTestSubmission(submission)
      } catch {}
      try {
        endTestSession()
      } catch {}
    } catch (e) {
      // Non-blocking; still show result
      console.error('Test submission error:', e)
    } finally {
      setTestState(prev => ({
        ...prev,
        score,
        isSubmitting: false
      }))
    }

    // Safety: ensure spinner cannot hang beyond 2s
    setTimeout(() => {
      setTestState(prev => ({ ...prev, isSubmitting: false }))
    }, 2000)
  }

  // Auto-redirect countdown (must be declared before any early returns)
  const [redirectIn, setRedirectIn] = useState<number>(7)
  useEffect(() => {
    if (testState.isCompleted && !testState.isSubmitting) {
      setRedirectIn(7)
      const iv = setInterval(() => setRedirectIn((s) => {
        if (s <= 1) {
          clearInterval(iv)
          navigate('/plan-sell-info', { replace: true })
          return 0
        }
        return s - 1
      }), 1000)
      return () => clearInterval(iv)
    }
  }, [testState.isCompleted, testState.isSubmitting, navigate])

  // Derive score safely in UI (handles any race conditions)
  const resultScore = useMemo(() => {
    return typeof testState.score === 'number' 
      ? testState.score 
      : calculateScore(testState.responses, sampleQuestions)
  }, [testState.score, testState.responses])

  // Redirect only after verification completes
  if (!testState.isVerifying && (testState.phone === null || !testState.isValidToken)) {
    return <Navigate to="/" replace />
  }

  // Loading state
  if (testState.isVerifying || !testState.phone || !testState.isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Test completed state
  if (testState.isCompleted && !testState.isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            {testState.timeUp ? (
              <div className="text-red-600 text-4xl mb-2">⏰</div>
            ) : (
              <div className="text-green-600 text-4xl mb-2">✅</div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Test {testState.timeUp ? 'Time Up!' : 'Completed!'}
            </h1>
            <p className="text-gray-600">
              {testState.timeUp 
                ? 'The test has been automatically submitted due to time limit.'
                : 'Thank you for completing the test.'}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {resultScore}%
            </div>
            <div className="text-sm text-gray-600">
              {testState.responses.length} of {TOTAL_QUESTIONS} questions answered
            </div>
          </div>

            <div className="text-sm text-gray-500 space-y-1">
            <p>SEC: {secDetails?.name ? `${secDetails.name} (${testState.phone})` : testState.phone}</p>
            {secDetails?.store?.storeName && (
              <p>Store: {secDetails.store.storeName}{secDetails.store.city ? `, ${secDetails.store.city}` : ''}</p>
            )}
            <p>Submitted: {new Date().toLocaleString()}</p>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>Redirecting to Plan Sell Info in <span className="font-semibold">{redirectIn}s</span>...</p>
            <button
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => navigate('/plan-sell-info', { replace: true })}
            >
              Go now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Submitting state
  if (testState.isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Submitting your test...</p>
        </div>
      </div>
    )
  }

  // Main test interface
  const currentQuestion = sampleQuestions[testState.currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Timer */}
      <TestTimer 
        duration={TEST_DURATION}
        onTimeUp={handleTimeUp}
        isActive={!testState.isCompleted}
      />

      {/* Proctoring */}
      <ProctoringPanel 
        secId={testState.phone!}
        sessionToken={'test-token'}
        onFlag={() => setTestState(prev => ({ ...prev, }))}
      />

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">SEC Knowledge Test</h1>
              <p className="text-sm text-gray-600">
                {secDetails?.name ? `${secDetails.name} (${testState.phone})` : `Phone: ${testState.phone}`}
                {secDetails?.store?.storeName ? ` • ${secDetails.store.storeName}${secDetails.store.city ? `, ${secDetails.store.city}` : ''}` : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Questions</div>
              <div className="text-lg font-bold text-blue-600">{TOTAL_QUESTIONS}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        questionNumber={testState.currentQuestionIndex + 1}
        totalQuestions={TOTAL_QUESTIONS}
        onAnswer={handleAnswerSubmit}
        isSubmitting={testState.isSubmitting}
      />

      {/* Instructions */}
      <div className="max-w-2xl mx-auto mt-6 text-center text-xs text-gray-500">
        <p>Read each question carefully and select the best answer.</p>
        <p>Once you submit an answer, you cannot go back to change it.</p>
      </div>
    </div>
  )
}