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

    const exportData = filteredSubmissions.map(submission => ({
      'SEC ID': submission.secId,
      'Store': submission.storeName ? `${submission.storeName}, ${submission.storeCity || ''}` : 'N/A',
      'Score': submission.score + '%',
      'Questions Answered': submission.responses.length,
      'Total Questions': submission.totalQuestions,
      'Completion Time (min)': Math.round(submission.completionTime / 60),
      'Submitted At': new Date(submission.submittedAt).toLocaleString(),
      'Status': submission.score >= 60 ? 'PASS' : 'FAIL',
      'Proctoring Flagged': submission.isProctoringFlagged ? 'YES' : 'NO'
    }))

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
                      <button
                        onClick={() => navigate(`/admin/screenshots?phone=${encodeURIComponent(submission.phone || submission.secId)}`)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors w-full"
                      >
                        📸 View
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