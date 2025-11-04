import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTestSubmissions, getTestStatistics, TestSubmission } from '@/lib/testData'
import * as XLSX from 'xlsx'
import { FaArrowLeft } from 'react-icons/fa'

export function AdminTestResults() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<TestSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<TestSubmission[]>([])
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    passRate: 0,
    averageTime: 0
  })
  const [sortBy, setSortBy] = useState<'score' | 'submittedAt' | 'secId'>('submittedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterScore, setFilterScore] = useState<'all' | 'pass' | 'fail'>('all')

  useEffect(() => {
    const fetchData = async () => {
      const data = await getTestSubmissions()
      const statistics = await getTestStatistics()
      setSubmissions(data)
      setFilteredSubmissions(data)
      setStats(statistics)
    }
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = [...submissions]

    // Apply score filter
    if (filterScore === 'pass') {
      filtered = filtered.filter(sub => sub.score >= 60)
    } else if (filterScore === 'fail') {
      filtered = filtered.filter(sub => sub.score < 60)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score
          break
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
          break
        case 'secId':
          comparison = a.secId.localeCompare(b.secId)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredSubmissions(filtered)
  }, [submissions, sortBy, sortOrder, filterScore])

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = filteredSubmissions.map(submission => {
      // Check if responses have enriched data
      const hasEnrichedData = submission.responses.some(r => r.isCorrect !== undefined)
      
      const correctCount = hasEnrichedData ? submission.responses.filter(r => r.isCorrect).length : 'N/A'
      const wrongCount = hasEnrichedData ? submission.responses.filter(r => !r.isCorrect).length : 'N/A'
      const answerDetails = hasEnrichedData 
        ? submission.responses.map((r, idx) => 
            `Q${idx + 1}: ${r.isCorrect ? 'CORRECT' : 'WRONG'} (Selected: ${r.selectedAnswer}, Correct: ${r.correctAnswer})`
          ).join(' | ')
        : 'Answer details not available'
      
      return {
        'SEC ID': submission.secId,
        'Store': submission.storeName ? `${submission.storeName}, ${submission.storeCity || ''}` : 'N/A',
        'Score': submission.score + '%',
        'Correct Answers': correctCount,
        'Wrong Answers': wrongCount,
        'Questions Answered': submission.responses.length,
        'Total Questions': submission.totalQuestions,
        'Completion Time (min)': Math.round(submission.completionTime / 60),
        'Submitted At': new Date(submission.submittedAt).toLocaleString(),
        'Status': submission.score >= 60 ? 'PASS' : 'FAIL',
        'Proctoring Flagged': submission.isProctoringFlagged ? 'YES' : 'NO',
        'Answer Details': answerDetails
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results')

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `SEC_Test_Results_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
        </div>
        <button
          onClick={exportToExcel}
          disabled={filteredSubmissions.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{stats.totalSubmissions}</div>
          <div className="text-sm text-gray-600">Total Submissions</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">{stats.passRate}%</div>
          <div className="text-sm text-gray-600">Pass Rate (≥60%)</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">{formatTime(stats.averageTime)}</div>
          <div className="text-sm text-gray-600">Avg. Time</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value as typeof filterScore)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Results</option>
              <option value="pass">Pass (≥60%)</option>
              <option value="fail">Fail (&lt;60%)</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredSubmissions.length} of {submissions.length} results
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No test submissions yet</h3>
            <p>Test results will appear here once SECs complete their assessments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('secId')}
                  >
                    SEC ID {sortBy === 'secId' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th 
                    className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('score')}
                  >
                    Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="w-[9%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th 
                    className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('submittedAt')}
                  >
                    Submitted {sortBy === 'submittedAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-[9%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SS
                  </th>
                  <th className="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Answers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission, i) => (
                  <tr key={submission.id || `${submission.secId}-${submission.submittedAt}-${i}`} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 truncate">
                      {submission.secId}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {submission.storeName ? (
                        <div className="truncate">
                          <div className="font-medium truncate">{submission.storeName}</div>
                          <div className="text-gray-500 text-xs truncate">{submission.storeCity}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getScoreColor(submission.score)}`}>
                        {submission.score}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {submission.responses.length}/{submission.totalQuestions}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {formatTime(submission.completionTime)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-900">
                      {new Date(submission.submittedAt).toLocaleString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full inline-block text-center ${
                          submission.score >= 60 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {submission.score >= 60 ? 'PASS' : 'FAIL'}
                        </span>
                        {submission.isProctoringFlagged && (
                          <button
                            onClick={() => navigate(`/admin/proctoring?phone=${encodeURIComponent(submission.phone || submission.secId)}`)}
                            className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer transition-colors"
                          >
                            ⚠️ FLAG
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {submission.screenshotUrls && submission.screenshotUrls.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {submission.screenshotUrls.slice(0, 3).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-8 h-8 rounded-full border-2 border-white object-cover cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => navigate(`/admin/screenshots?sessionToken=${encodeURIComponent(submission.sessionToken)}&secId=${encodeURIComponent(submission.secId)}`)}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ))}
                          </div>
                          {submission.screenshotUrls.length > 3 && (
                            <span className="text-xs text-gray-500">+{submission.screenshotUrls.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/admin/screenshots?sessionToken=${encodeURIComponent(submission.sessionToken)}&secId=${encodeURIComponent(submission.secId)}`)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors w-full"
                        >
                          📸 View
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => {
                          // Check if responses have enriched data
                          const hasEnrichedData = submission.responses.some(r => r.isCorrect !== undefined && r.correctAnswer !== undefined)
                          
                          if (!hasEnrichedData) {
                            // Show basic response data without correct/incorrect info
                            const answersHTML = submission.responses.map((r, idx) => {
                              return `<div style="margin-bottom: 12px; padding: 8px; background: #f9fafb; border-radius: 6px;">
                                <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">
                                  Q${idx + 1}: Question ID ${r.questionId}
                                </div>
                                <div style="font-size: 0.875rem; color: #6b7280;">
                                  Selected Answer: <strong>${r.selectedAnswer}</strong>
                                </div>
                                <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 4px;">
                                  ⚠️ Question details not available - question may have been deleted from bank
                                </div>
                              </div>`
                            }).join('')
                            
                            const modal = document.createElement('div')
                            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;'
                            modal.innerHTML = `
                              <div style="background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                  <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827;">Answer Details - ${submission.secId}</h2>
                                  <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 4px 8px; background: #f3f4f6; border-radius: 6px; cursor: pointer; border: none; font-size: 1.25rem;">✕</button>
                                </div>
                                <div style="margin-bottom: 16px; padding: 12px; background: #fef3c7; border-radius: 6px;">
                                  <div style="color: #92400e; font-size: 0.875rem;">
                                    ⚠️ Question details not available in database. Questions may have been updated or deleted from the question bank.
                                  </div>
                                </div>
                                <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 6px; display: flex; gap: 24px;">
                                  <div>
                                    <span style="color: #6b7280; font-size: 0.875rem;">Questions Answered:</span>
                                    <strong style="color: #3b82f6; margin-left: 8px;">${submission.responses.length}</strong>
                                  </div>
                                  <div>
                                    <span style="color: #6b7280; font-size: 0.875rem;">Score:</span>
                                    <strong style="color: #3b82f6; margin-left: 8px;">${submission.score}%</strong>
                                  </div>
                                </div>
                                ${answersHTML}
                              </div>
                            `
                            modal.onclick = (e) => { if (e.target === modal) modal.remove() }
                            document.body.appendChild(modal)
                            return
                          }
                          
                          const correctCount = submission.responses.filter(r => r.isCorrect).length
                          const wrongCount = submission.responses.filter(r => !r.isCorrect).length
                          const answersHTML = submission.responses.map((r, idx) => {
                            const icon = r.isCorrect ? '✓' : '✗'
                            const color = r.isCorrect ? '#22c55e' : '#ef4444'
                            const bgColor = r.isCorrect ? '#f0fdf4' : '#fef2f2'
                            return `<div style="margin-bottom: 12px; padding: 8px; background: ${bgColor}; border-radius: 6px; border-left: 3px solid ${color};">
                              <div style="font-weight: 600; color: ${color}; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.25rem;">${icon}</span>
                                <span>Q${idx + 1}: ${r.questionText || 'Question ' + r.questionId}</span>
                              </div>
                              <div style="font-size: 0.875rem; color: #374151; margin-top: 8px;">
                                <div style="margin-bottom: 4px;">
                                  <span style="color: #6b7280;">Selected:</span> <strong style="color: ${r.isCorrect ? '#059669' : '#dc2626'};">${r.selectedAnswer}</strong>
                                </div>
                                ${!r.isCorrect ? `<div>
                                  <span style="color: #6b7280;">Correct Answer:</span> <strong style="color: #059669;">${r.correctAnswer}</strong>
                                </div>` : ''}
                              </div>
                            </div>`
                          }).join('')
                          
                          const modal = document.createElement('div')
                          modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;'
                          modal.innerHTML = `
                            <div style="background: white; padding: 24px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827;">Answer Details - ${submission.secId}</h2>
                                <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 4px 8px; background: #f3f4f6; border-radius: 6px; cursor: pointer; border: none; font-size: 1.25rem;">✕</button>
                              </div>
                              <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 6px; display: flex; gap: 24px; flex-wrap: wrap;">
                                <div>
                                  <span style="color: #6b7280; font-size: 0.875rem;">Correct:</span>
                                  <strong style="color: #22c55e; margin-left: 8px; font-size: 1.125rem;">${correctCount}</strong>
                                </div>
                                <div>
                                  <span style="color: #6b7280; font-size: 0.875rem;">Wrong:</span>
                                  <strong style="color: #ef4444; margin-left: 8px; font-size: 1.125rem;">${wrongCount}</strong>
                                </div>
                                <div>
                                  <span style="color: #6b7280; font-size: 0.875rem;">Score:</span>
                                  <strong style="color: #3b82f6; margin-left: 8px; font-size: 1.125rem;">${submission.score}%</strong>
                                </div>
                              </div>
                              ${answersHTML}
                            </div>
                          `
                          modal.onclick = (e) => { if (e.target === modal) modal.remove() }
                          document.body.appendChild(modal)
                        }}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors w-full flex items-center justify-center gap-1"
                      >
                        <span>📋</span>
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}