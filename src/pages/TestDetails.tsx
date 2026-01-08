import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { TestSubmission, Question, getTestSubmissionById, getQuestionsForSEC } from '@/lib/testData'
import { config } from '@/lib/config'

export function TestDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [submission, setSubmission] = useState<TestSubmission | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)

      // Strategy 1: Use state passed from navigation
      if (location.state?.submission) {
        const sub = location.state.submission
        setSubmission(sub)

        // Fetch questions specifically for this SEC/User to ensure we get the correct data/answers
        try {
          const identifier = sub.secId || sub.phone || ''
          if (identifier) {
            const questions = await getQuestionsForSEC(identifier)
            setAllQuestions(questions)
          } else {
            // Fallback
            const response = await fetch(`${config.apiUrl}/questions`)
            const result = await response.json()
            if (result.success) setAllQuestions(result.data)
          }
        } catch (error) {
          console.error('Error fetching questions:', error)
        }
        setLoading(false)
        return
      }

      // Strategy 2: Fetch by ID from URL
      if (id) {
        const data = await getTestSubmissionById(id)

        if (data) {
          setSubmission(data)

          try {
            const identifier = data.secId || data.phone || ''
            if (identifier) {
              const questions = await getQuestionsForSEC(identifier)
              setAllQuestions(questions)
            }
          } catch (e) {
            console.error('Error fetching SEC questions', e)
          }
        } else {
          console.error('Submission not found')
          navigate('/results')
        }
        setLoading(false)
        return
      }

      // No ID and no State -> Redirect
      navigate('/results')
    }

    fetchDetails()
  }, [id, location.state, navigate])

  if (loading || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    )
  }

  const correctCount = Math.round((submission.score / 100) * submission.totalQuestions)

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back
            </button>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${submission.score >= 60 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              Score: {submission.score}%
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Details</h1>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <span className="text-gray-500">SEC ID:</span>
              <span className="ml-2 font-semibold">{submission.secId}</span>
            </div>
            <div>
              <span className="text-gray-500">Time:</span>
              <span className="ml-2 font-semibold">{Math.floor(submission.completionTime / 60)}m {submission.completionTime % 60}s</span>
            </div>
            <div>
              <span className="text-gray-500">Correct Answers:</span>
              <span className="ml-2 font-semibold">{correctCount}/{submission.totalQuestions}</span>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>
              <span className="ml-2 font-semibold">{new Date(submission.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Answer Review</h2>

          {submission.responses.map((response, index) => {
            // Try to find question in allQuestions
            let question = allQuestions.find(q => q.id === response.questionId)
            const enrichedData = response as any

            // Fallback/Merge enriched data if local question is missing or incomplete
            if (enrichedData.questionText) {
              if (!question) {
                question = {
                  id: response.questionId,
                  question: enrichedData.questionText,
                  options: enrichedData.options || [],
                  correctAnswer: enrichedData.correctAnswer,
                  category: enrichedData.category
                }
              } else if (!question.correctAnswer && enrichedData.correctAnswer) {
                question = { ...question, correctAnswer: enrichedData.correctAnswer }
              }
            }

            if (!question) return null

            // Clean values for comparison
            const correctAnsRaw = (question.correctAnswer || '').trim() // Keep case for now
            const selectedAnsRaw = (response.selectedAnswer || '').trim()

            // Robust Matcher Function - STRICT VERSION
            const isMatch = (optionStr: string, benchmarkVal: string, optionIndex: number) => {
              if (!benchmarkVal) return false

              const opt = optionStr.toUpperCase().trim()
              const bench = benchmarkVal.toUpperCase().trim()

              // 1. Identify Option Identifier (A, B, C...)
              let optionId = ''
              const prefixMatch = optionStr.match(/^([A-Da-d])[\)\.]/);
              if (prefixMatch) {
                optionId = prefixMatch[1].toUpperCase()
              } else {
                optionId = String.fromCharCode(65 + optionIndex) // 0->A
              }

              // 2. Identify Just the Text
              const cleanOptText = optionStr.replace(/^([A-Da-d0-9]+)[\)\.]\s*/, '').toUpperCase().trim();

              // Rule A: Match by ID (e.g. Answer="A", Option="A")
              if (bench === optionId) return true

              // Rule B: Match by Exact Text
              if (opt === bench) return true
              if (cleanOptText === bench) return true

              return false
            }

            // Determine explicit correctness state
            let isCorrect = response.isCorrect
            if (isCorrect === undefined) {
              isCorrect = isMatch(selectedAnsRaw, correctAnsRaw, -1) // -1 index ignores index check for simple equality check
              // Re-verify strictly:
              if (selectedAnsRaw.toUpperCase() === correctAnsRaw.toUpperCase()) isCorrect = true
            }

            // Check if we successfully highlighted ANY option as correct
            const anyOptionHighlighted = question.options.some((opt, idx) => isMatch(opt, correctAnsRaw, idx))

            return (
              <div
                key={response.questionId}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-500">Question {index + 1}</span>
                      {isCorrect ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                          ✓ Correct
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          ✗ Incorrect
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">{question.question}</p>
                    {/* Fallback Warning if we couldn't match the correct answer to a UI option */}
                    {!isCorrect && !anyOptionHighlighted && correctAnsRaw && (
                      <div className="mt-2 text-sm bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200">
                        <strong>Note:</strong> Expected answer is "{correctAnsRaw}" but it didn't match the options perfectly.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {question.options.map((option, optIndex) => {
                    // Robust check: Is this option the one selected?
                    const isSelected = isMatch(option, selectedAnsRaw, optIndex)

                    // Robust check: Is this option the correct one?
                    const isCorrectOption = isMatch(option, correctAnsRaw, optIndex)

                    return (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border-2 ${isCorrectOption
                          ? 'bg-green-50 border-green-500' // Correct is always green bg
                          : isSelected
                            ? 'bg-red-50 border-red-500' // Wrong selection is red bg
                            : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`flex-1 ${isCorrectOption ? 'text-green-900 font-bold' :
                            isSelected ? 'text-red-900 font-semibold' :
                              'text-gray-700'
                            }`}>
                            {option}
                          </span>

                          <div className="flex md:flex-row flex-col items-end gap-1 ml-3 min-w-[max-content]">
                            {/* Show CORRECT badge if this is the right option */}
                            {isCorrectOption && (
                              <span className="text-green-700 text-xs uppercase font-bold bg-green-200 px-2 py-1 rounded whitespace-nowrap">
                                ✓ Correct Answer
                              </span>
                            )}

                            {/* Show YOUR ANSWER badge if this is what user picked */}
                            {isSelected && (
                              <span className={`text-xs uppercase font-bold px-2 py-1 rounded whitespace-nowrap ${isCorrectOption
                                ? 'text-green-800 bg-green-100 border border-green-300'
                                : 'text-red-700 bg-red-100 border border-red-300'
                                }`}>
                                {isCorrectOption ? '(You Chose This)' : 'Your Answer'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 mb-8">
          <button
            onClick={() => navigate('/plan-sell-info')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/results')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Back to All Results
          </button>
        </div>
      </div>
    </div>
  )
}
