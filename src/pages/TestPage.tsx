import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
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
  getQuestionsForPhone,
  Question,
  TestResponse, 
  saveTestSubmission, 
  calculateScore 
} from '@/lib/testData'

// Test configuration
const TEST_DURATION = 15 * 60 // 15 minutes in seconds

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

interface StoreInfo {
  id: string
  storeName: string
  city: string
}

export function TestPage() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null)
  const [testQuestions, setTestQuestions] = useState<Question[]>([])
  const [sessionToken, setSessionToken] = useState<string>('')

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

      // Check if store was selected
      const storesFromState = location.state?.stores
      if (!storesFromState || !Array.isArray(storesFromState) || storesFromState.length === 0) {
        navigate(`/test-store-selection?phone=${phone}`, { replace: true })
        return
      }
      setSelectedStore(storesFromState[0])

      // Generate questions for this phone number (10 random questions with at least 1 from each section)
      const questions = getQuestionsForPhone(phone)
      setTestQuestions(questions)
      console.log(`✅ Generated ${questions.length} questions for phone ${phone}`)

      // Create and save test session
      const session = createTestSession(phone)
      saveTestSession(session)
      setSessionToken(session.token)

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
    if (testState.isCompleted || testState.isSubmitting || testQuestions.length === 0) return

    const currentQuestion = testQuestions[testState.currentQuestionIndex]
    const response: TestResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      answeredAt: new Date().toISOString()
    }

    setTestState(prev => {
      // Update or add response for current question
      const existingIndex = prev.responses.findIndex(r => r.questionId === currentQuestion.id)
      let newResponses: TestResponse[]
      
      if (existingIndex >= 0) {
        // Update existing response
        newResponses = [...prev.responses]
        newResponses[existingIndex] = response
      } else {
        // Add new response
        newResponses = [...prev.responses, response]
      }
      
      const isLastQuestion = prev.currentQuestionIndex === testQuestions.length - 1

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
  }, [testState.currentQuestionIndex, testState.isCompleted, testState.isSubmitting, testState.startTime, testQuestions])

  // Handle previous question
  const handlePreviousQuestion = useCallback(() => {
    if (testState.currentQuestionIndex === 0) return
    
    setTestState(prev => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex - 1
    }))
  }, [testState.currentQuestionIndex])

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
    const score = calculateScore(responses, testQuestions)
    const completionTime = Math.floor((Date.now() - new Date(startTime || new Date().toISOString()).getTime()) / 1000)

    try {
      if (!identifier) throw new Error('Missing identifier')

      // Check if there are any proctoring violations (excluding mic_active and snapshot)
      let isProctoringFlagged = false
      try {
        const proctoringRes = await fetch(`${config.apiUrl}/proctoring/events?phone=${encodeURIComponent(testState.phone || identifier)}`)
        const proctoringData = await proctoringRes.json()
        if (proctoringData.data && proctoringData.data.length > 0) {
          // Filter out benign events (mic_active and snapshot) to determine if actually flagged
          const violations = proctoringData.data.filter((e: any) => 
            e.eventType !== 'mic_active' && e.eventType !== 'snapshot'
          )
          isProctoringFlagged = violations.length > 0
        }
      } catch (e) {
        console.error('Failed to check proctoring events:', e)
      }

      const submission = {
        secId: identifier,
        phone: testState.phone || undefined,
        sessionToken: sessionToken || 'test-token',
        responses,
        score,
        totalQuestions: testQuestions.length,
        submittedAt: new Date().toISOString(),
        completionTime,
        isProctoringFlagged,
        storeId: selectedStore?.id,
        storeName: selectedStore?.storeName,
        storeCity: selectedStore?.city
      }

      try {
        await saveTestSubmission(submission)
      } catch (e) {
        console.error('Failed to save submission:', e)
      }
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

  // Derive score safely in UI (handles any race conditions)
  const resultScore = useMemo(() => {
    return typeof testState.score === 'number' 
      ? testState.score 
      : calculateScore(testState.responses, testQuestions)
  }, [testState.score, testState.responses, testQuestions])

  // Navigate to results page on completion
  useEffect(() => {
    if (testState.isCompleted && !testState.isSubmitting) {
      // Store result data for the results page
      const resultData = {
        phone: testState.phone!,
        score: resultScore,
        totalQuestions: testQuestions.length,
        responses: testState.responses,
        submittedAt: new Date().toISOString(),
        completionTime: Math.floor((Date.now() - new Date(testState.startTime).getTime()) / 1000),
        secDetails,
        store: selectedStore
      }
      localStorage.setItem('last_test_result', JSON.stringify(resultData))
      navigate('/test-result', { state: { result: resultData }, replace: true })
    }
  }, [testState.isCompleted, testState.isSubmitting, testState.phone, testState.responses, testState.startTime, resultScore, secDetails, navigate])

  // Redirect only after verification completes
  if (!testState.isVerifying && (testState.phone === null || !testState.isValidToken)) {
    return <Navigate to="/" replace />
  }

  // Loading state
  if (testState.isVerifying || !testState.phone || !testState.isValidToken || testQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{testQuestions.length === 0 ? 'Loading questions...' : 'Verifying access...'}</p>
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
  const currentQuestion = testQuestions[testState.currentQuestionIndex]
  
  // Get existing answer for current question if it exists
  const existingResponse = testState.responses.find(r => r.questionId === currentQuestion.id)
  const initialSelectedAnswer = existingResponse?.selectedAnswer || ''

  return (
    <div className="min-h-screen bg-gray-50 p-4 select-none" onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}>
      {/* Timer */}
      <TestTimer 
        duration={TEST_DURATION}
        onTimeUp={handleTimeUp}
        isActive={!testState.isCompleted}
      />

      {/* Proctoring */}
      <ProctoringPanel 
        secId={testState.phone!}
        phone={testState.phone!}
        sessionToken={sessionToken}
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
                {selectedStore && ` • ${selectedStore.storeName}, ${selectedStore.city}`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Questions</div>
              <div className="text-lg font-bold text-blue-600">{testQuestions.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        questionNumber={testState.currentQuestionIndex + 1}
        totalQuestions={testQuestions.length}
        onAnswer={handleAnswerSubmit}
        onPrev={handlePreviousQuestion}
        initialSelectedAnswer={initialSelectedAnswer}
        isSubmitting={testState.isSubmitting}
      />

      {/* Instructions */}
      <div className="max-w-2xl mx-auto mt-6 text-center text-xs text-gray-500">
        <p>Read each question carefully and select the best answer.</p>
        <p>You can navigate back to review or change previous answers.</p>
      </div>
    </div>
  )
}
