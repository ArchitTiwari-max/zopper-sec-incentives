import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TestSubmission, Question } from '@/lib/testData'
import { FaArrowLeft } from 'react-icons/fa'

export function AdminAnswerDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const [submission, setSubmission] = useState<TestSubmission | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      if (location.state?.submission) {
        const sub = location.state.submission
        setSubmission(sub)
        
        // Fetch all questions from the question bank
        try {
          const response = await fetch('http://localhost:3001/api/questions')
          const result = await response.json()
          if (result.success && result.data) {
            setAllQuestions(result.data)
          }
        } catch (error) {
          console.error('Error fetching questions:', error)
        }
        setLoading(false)
      } else {
        navigate('/admin/test-results')
      }
    }
    fetchQuestions()
  }, [location, navigate])

  if (loading || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading answer details...</p>
        </div>
      </div>
    )
  }

  // Check if responses have enriched data
  const hasEnrichedData = submission.responses.some(r => r.isCorrect !== undefined && r.correctAnswer !== undefined)
  const correctCount = hasEnrichedData 
    ? submission.responses.filter(r => r.isCorrect).length 
    : Math.round((submission.score / 100) * submission.totalQuestions)
  const wrongCount = hasEnrichedData
    ? submission.responses.filter(r => !r.isCorrect).length
    : submission.totalQuestions - correctCount

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/admin/test-results')}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium"
            >
              <FaArrowLeft size={16} />
              Back to Test Results
            </button>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              submission.score >= 80 
                ? 'bg-green-50 text-green-700' 
                : submission.score >= 60 
                ? 'bg-yellow-50 text-yellow-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {submission.score >= 60 ? 'PASS' : 'FAIL'} - {submission.score}%
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Answer Details - {submission.secId}</h1>
          
          {/* Warning if questions not available */}
          {!hasEnrichedData && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div className="text-yellow-800 text-sm">
                  <strong>Question details not available in database.</strong> Questions may have been updated or deleted from the question bank.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block mb-1">SEC ID</span>
              <span className="font-semibold text-gray-900">{submission.secId}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block mb-1">Store</span>
              <span className="font-semibold text-gray-900">
                {submission.storeName ? `${submission.storeName}` : 'N/A'}
              </span>
              {submission.storeCity && (
                <span className="text-xs text-gray-500 block">{submission.storeCity}</span>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-gray-500 block mb-1">Correct</span>
              <span className="font-semibold text-green-700 text-lg">{correctCount}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <span className="text-gray-500 block mb-1">Wrong</span>
              <span className="font-semibold text-red-700 text-lg">{wrongCount}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block mb-1">Questions</span>
              <span className="font-semibold text-gray-900">{submission.responses.length}/{submission.totalQuestions}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block mb-1">Time</span>
              <span className="font-semibold text-gray-900">
                {Math.floor(submission.completionTime/60)}m {submission.completionTime%60}s
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg col-span-2">
              <span className="text-gray-500 block mb-1">Submitted</span>
              <span className="font-semibold text-gray-900">{new Date(submission.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Answer Review</h2>
          
          {submission.responses.map((response, index) => {
            // Try to find question in bank
            const question = allQuestions.find(q => q.id === response.questionId)
            
            // Use enriched data if available
            const isCorrect = hasEnrichedData ? response.isCorrect : (question && response.selectedAnswer === question.correctAnswer)
            const questionText = response.questionText || question?.question || 'Question text not available'
            const correctAnswer = response.correctAnswer || question?.correctAnswer || 'Unknown'
            const options = response.options || question?.options || []
            
            // If no question data available at all
            if (!hasEnrichedData && !question) {
              return (
                <div
                  key={response.questionId || index}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-500">
                          Question {index + 1} (ID: {response.questionId})
                        </span>
                      </div>
                      <p className="text-gray-500 italic">Question details not available</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">SEC's Answer:</div>
                    <div className="font-semibold text-gray-900">{response.selectedAnswer}</div>
                  </div>

                  <div className="mt-3 text-xs text-yellow-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Question details not available - may have been deleted from bank</span>
                  </div>
                </div>
              )
            }
            
            return (
              <div
                key={response.questionId || index}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  isCorrect ? 'border-green-500' : 'border-red-500'
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
                    <p className="text-gray-900 font-medium">{questionText}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {options.length > 0 ? (
                    options.map((option, optIndex) => {
                      const optionLetter = String.fromCharCode(65 + optIndex) // A, B, C, D
                      const isSelected = response.selectedAnswer === optionLetter
                      const isCorrectAnswer = correctAnswer === optionLetter
                      
                      return (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg border-2 ${
                            isCorrectAnswer
                              ? 'bg-green-50 border-green-500'
                              : isSelected
                              ? 'bg-red-50 border-red-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`${
                              isCorrectAnswer ? 'text-green-900 font-semibold' : 
                              isSelected ? 'text-red-900 font-semibold' : 
                              'text-gray-700'
                            }`}>
                              {optionLetter}) {option}
                            </span>
                            {isCorrectAnswer && (
                              <span className="text-green-700 text-sm font-semibold">✓ Correct Answer</span>
                            )}
                            {isSelected && !isCorrectAnswer && (
                              <span className="text-red-700 text-sm font-semibold">✗ Selected</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    // Fallback if no options available
                    <>
                      <div className={`p-3 rounded-lg border-2 ${
                        isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                      }`}>
                        <div className="text-xs text-gray-500 mb-1">SEC's Answer:</div>
                        <div className="font-semibold text-gray-900">{response.selectedAnswer}</div>
                      </div>
                      {!isCorrect && (
                        <div className="p-3 bg-green-50 border-2 border-green-500 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Correct Answer:</div>
                          <div className="font-semibold text-green-900">{correctAnswer}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/test-results')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Back to Test Results
          </button>
        </div>
      </div>
    </div>
  )
}
