import { useState, useEffect } from 'react'
import { Question } from '@/lib/testData'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  onAnswer: (selectedAnswer: string) => void
  onPrev?: () => void
  initialSelectedAnswer?: string
  isSubmitting?: boolean
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onPrev,
  initialSelectedAnswer = '',
  isSubmitting = false
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>(initialSelectedAnswer)

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(initialSelectedAnswer)
  }, [question.id, questionNumber, initialSelectedAnswer])

  const handleOptionSelect = (option: string) => {
    if (isSubmitting) return
    setSelectedAnswer(option)
  }

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitting) return
    onAnswer(selectedAnswer)
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {questionNumber} of {totalQuestions}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const optionLetter = option.charAt(0)
            const isSelected = selectedAnswer === optionLetter

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(optionLetter)}
                disabled={isSubmitting}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <span className="font-medium mr-2">{optionLetter})</span>
                {option.substring(3)} {/* Remove "A) " prefix */}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <button
          onClick={onPrev}
          disabled={!onPrev || questionNumber === 1 || isSubmitting}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-medium border transition-all duration-200 text-sm sm:text-base ${onPrev && questionNumber > 1 && !isSubmitting
              ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
        >
          Previous
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${selectedAnswer && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 cursor-not-allowed text-gray-500'
            }`}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : questionNumber === totalQuestions ? (
            'Submit Test'
          ) : (
            'Next Question'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        You can review previous questions before submitting the test.
      </p>
    </div>
  )
}
