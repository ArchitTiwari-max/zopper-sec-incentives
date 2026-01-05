import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { TestSubmission, Question, getTestSubmissionById } from '@/lib/testData'
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
        setSubmission(location.state.submission)
        // Ensure questions are loaded
        try {
          const response = await fetch(`${config.apiUrl}/questions`)
          const result = await response.json()
          if (result.success && result.data) {
            setAllQuestions(result.data)
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

          // The backend endpoint returns enriched responses with question text etc.
          const constructedQuestions: Question[] = data.responses.map((r: any) => ({
            id: r.questionId,
            question: r.questionText || '',
            options: r.options || [],
            correctAnswer: r.correctAnswer || '',
            category: r.category
          }))

          if (constructedQuestions.length > 0 && constructedQuestions[0].question) {
            setAllQuestions(constructedQuestions)
          } else {
            // Fallback if enriched data is missing
            const qResponse = await fetch(`${config.apiUrl}/questions`)
            const qResult = await qResponse.json()
            if (qResult.success && qResult.data) {
              setAllQuestions(qResult.data)
            }
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
            // Try to find question in allQuestions (which might be constructed from enriched response)
            // or fallback to looking up by ID if we fetched the full list
            let question = allQuestions.find(q => q.id === response.questionId)

            // If response itself has enriched data, use that as fallback if question not found
            if (!question && (response as any).questionText) {
              question = {
                id: response.questionId,
                question: (response as any).questionText,
                options: (response as any).options || [],
                correctAnswer: (response as any).correctAnswer,
                category: (response as any).category
              }
            }

            if (!question) return null

            const isCorrect = response.selectedAnswer === question.correctAnswer

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
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {question.options.map((option, optIndex) => {
                    const optionLetter = String.fromCharCode(65 + optIndex) // A, B, C, D
                    const isSelected = response.selectedAnswer === optionLetter
                    const isCorrectAnswer = question.correctAnswer === optionLetter

                    return (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border-2 ${isCorrectAnswer
                          ? 'bg-green-50 border-green-500'
                          : isSelected
                            ? 'bg-red-50 border-red-500'
                            : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`${isCorrectAnswer ? 'text-green-900 font-semibold' :
                            isSelected ? 'text-red-900 font-semibold' :
                              'text-gray-700'
                            }`}>
                            {option}
                          </span>
                          {isCorrectAnswer && (
                            <span className="text-green-700 text-sm font-semibold">✓ Correct Answer</span>
                          )}
                          {isSelected && !isCorrectAnswer && (
                            <span className="text-red-700 text-sm font-semibold">Your Answer</span>
                          )}
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
