import { useState } from 'react'
import { Question } from '@/lib/testData'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  onAnswer: (selectedAnswer: string) => void
  isSubmitting?: boolean
}

export function QuestionCard({ 
  question, 
  questionNumber, 
  totalQuestions, 
  onAnswer, 
  isSubmitting = false 
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')

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
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {questionNumber} of {totalQuestions}</span>
          <span className="text-blue-600 font-medium">{question.category}</span>
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
                className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                  isSelected
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

      {/* Submit button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
            selectedAnswer && !isSubmitting
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

      {/* Warning about no back navigation */}
      <p className="text-xs text-gray-500 text-center mt-4">
        ⚠️ You cannot go back to previous questions once submitted
      </p>
    </div>
  )
}