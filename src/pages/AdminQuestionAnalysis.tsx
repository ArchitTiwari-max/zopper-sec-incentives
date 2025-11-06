import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import { config } from '@/lib/config'
import * as XLSX from 'xlsx'

interface QuestionStat {
  questionId: number
  questionText: string
  correctPercent: number
  wrongPercent: number
  mostWrongOption: string
  totalAttempts: number
}

interface QuestionAnalysisData {
  totalQuestions: number
  averageAccuracy: number
  questionStats: QuestionStat[]
  topWrong: Array<{
    questionId: number
    questionText: string
    correctPercent: number
  }>
  easiestQuestion: {
    questionId: number
    questionText: string
    correctPercent: number
  } | null
  hardestQuestion: {
    questionId: number
    questionText: string
    correctPercent: number
  } | null
}

export function AdminQuestionAnalysis() {
  const navigate = useNavigate()
  const [data, setData] = useState<QuestionAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestionAnalysis()
  }, [])

  const fetchQuestionAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${config.apiUrl}/admin/question-analysis`)
      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.message || 'Failed to fetch question analysis')
      }
    } catch (err) {
      console.error('Error fetching question analysis:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!data || data.questionStats.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = data.questionStats.map(q => ({
      'Q. No': q.questionId,
      'Question Text': q.questionText,
      'Correct %': q.correctPercent + '%',
      'Wrong %': q.wrongPercent + '%',
      'Most Wrong Answer': q.mostWrongOption,
      'Total Attempts': q.totalAttempts
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Question Analysis')

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Question_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const getAccuracyColor = (percent: number): string => {
    if (percent >= 70) return 'text-green-600 bg-green-50'
    if (percent >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getAccuracyBgColor = (percent: number): string => {
    if (percent >= 70) return 'bg-green-100'
    if (percent >= 40) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">Loading question analysis...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-600 mb-4">❌ {error}</div>
            <button 
              onClick={fetchQuestionAnalysis} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/test-results')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft size={16} />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">📊 Question Analysis</h1>
          </div>
          <button
            onClick={exportToExcel}
            disabled={data.questionStats.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <FaDownload size={14} />
            Export to Excel
          </button>
        </div>

        {/* Global Insights Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Global Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Questions</div>
              <div className="text-2xl font-bold text-blue-600">{data.totalQuestions}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Question Accuracy</div>
              <div className="text-2xl font-bold text-green-600">{data.averageAccuracy}%</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Easiest Question</div>
              {data.easiestQuestion ? (
                <>
                  <div className="text-lg font-bold text-purple-600">Q{data.easiestQuestion.questionId}</div>
                  <div className="text-xs text-gray-500">{data.easiestQuestion.correctPercent}% correct</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">N/A</div>
              )}
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Hardest Question</div>
              {data.hardestQuestion ? (
                <>
                  <div className="text-lg font-bold text-red-600">Q{data.hardestQuestion.questionId}</div>
                  <div className="text-xs text-gray-500">{data.hardestQuestion.correctPercent}% correct</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">N/A</div>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Most Incorrect Questions */}
        {data.topWrong.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🔴 Top 5 Most Incorrectly Answered</h2>
            <div className="space-y-3">
              {data.topWrong.map((question, index) => (
                <div 
                  key={question.questionId}
                  className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Q{question.questionId}: {question.questionText}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-200 text-red-800">
                      {question.correctPercent}% correct
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-wise Statistics Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Question-wise Performance</h2>
          </div>
          {data.questionStats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">No question data available</h3>
              <p>Question statistics will appear once SECs complete test submissions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Q.No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question Text
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correct %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wrong %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Most Wrong Answer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.questionStats.map((question) => (
                    <tr 
                      key={question.questionId} 
                      className={`hover:bg-gray-50 ${question.wrongPercent > 60 ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {question.questionId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {question.questionText}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {question.totalAttempts}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccuracyColor(question.correctPercent)}`}>
                            {question.correctPercent}%
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div 
                              className={`h-2 rounded-full ${getAccuracyBgColor(question.correctPercent)}`}
                              style={{ width: `${question.correctPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {question.wrongPercent}%
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {question.mostWrongOption}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
