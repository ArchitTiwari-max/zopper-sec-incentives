import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaFileUpload, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'

export function AdminQuestionUpload() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadStats, setUploadStats] = useState<{ questionsAdded: number; questionsDeleted: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const isExcel = selectedFile.type.includes('spreadsheet') || 
                      selectedFile.name.endsWith('.xlsx') || 
                      selectedFile.name.endsWith('.xls')
      if (isExcel) {
        setFile(selectedFile)
        setError(null)
        setSuccess(false)
        setUploadStats(null)
      } else {
        setError('Please select an Excel file (.xlsx or .xls)')
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !auth?.token) return

    setUploading(true)
    setError(null)
    setSuccess(false)
    setUploadStats(null)

    try {
      const formData = new FormData()
      formData.append('excel', file)

      const response = await authFetch(`${config.apiUrl}/questions/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setUploadStats({
          questionsAdded: result.data.questionsAdded,
          questionsDeleted: result.data.questionsDeleted
        })
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setError(result.message || 'Failed to upload questions')
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to Dashboard"
          >
            <FaArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Insert Test Questions</h1>
            <p className="text-sm text-gray-600 mt-1">Upload an Excel file containing test questions for SEC</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Upload an Excel file (.xlsx or .xls) containing test questions</li>
            <li>Excel should have columns: questionId, question, option1, option2, option3, option4, correctAnswer, category</li>
            <li>The Excel file will be parsed automatically</li>
            <li><strong>Warning:</strong> All existing questions in the database will be deleted and replaced with the new ones</li>
          </ul>
        </div>

        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center">
          <FaFileUpload className="mx-auto text-4xl text-gray-400 mb-4" />
          
          <label 
            htmlFor="file-input" 
            className="cursor-pointer inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Excel File
          </label>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {file && (
            <div className="mt-4 text-gray-700">
              <p className="font-medium">Selected file:</p>
              <p className="text-sm text-gray-600">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Uploading and Processing...</span>
              </>
            ) : (
              <>
                <FaFileUpload />
                <span>Upload and Replace Questions</span>
              </>
            )}
          </button>
        )}

        {/* Success Message */}
        {success && uploadStats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3"
          >
            <FaCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Upload Successful!</h3>
              <p className="text-sm text-green-800 mt-1">
                Questions have been updated successfully.
              </p>
              <div className="mt-2 text-sm text-green-700">
                <p>✓ Deleted {uploadStats.questionsDeleted} old questions</p>
                <p>✓ Added {uploadStats.questionsAdded} new questions</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          >
            <FaExclamationTriangle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Upload Failed</h3>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Warning Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> This action will permanently delete all existing questions from the database and replace them with the questions from the uploaded Excel file. This action cannot be undone. Please ensure the Excel file contains all the questions you want to use.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
