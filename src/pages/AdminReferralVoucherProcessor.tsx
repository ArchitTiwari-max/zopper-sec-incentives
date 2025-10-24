import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaUpload, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFileExcel } from 'react-icons/fa'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'

interface ProcessLog {
  row: number
  referrerPhone: string
  refereePhone: string
  referrerVoucher: string
  refereeVoucher: string
  status: string
  action: 'UPDATE' | 'SKIP' | 'ERROR'
  success: boolean
  message: string
}

interface ProcessResults {
  total: number
  processed: number
  updated: number
  skipped: number
  errors: number
  logs: ProcessLog[]
  summary: {
    updated: ProcessLog[]
    skipped: ProcessLog[]
    errors: ProcessLog[]
  }
}

export function AdminReferralVoucherProcessor() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessResults | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setResults(null)
    } else {
      alert('Please drop only Excel files (.xlsx or .xls)')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResults(null)
    }
  }

  const processFile = async () => {
    if (!file || !auth?.token) return

    setProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('excel', file)

const response = await authFetch(`${config.apiUrl}/admin/process-referral-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setResults(result.data)
      } else {
        alert(result.message || 'Failed to process file')
      }
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Network error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const resetProcessor = () => {
    setFile(null)
    setResults(null)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPDATE':
        return <FaCheckCircle className="text-green-500" />
      case 'SKIP':
        return <FaExclamationTriangle className="text-yellow-500" />
      case 'ERROR':
        return <FaTimesCircle className="text-red-500" />
      default:
        return null
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'UPDATE':
        return 'bg-green-50 text-green-800'
      case 'SKIP':
        return 'bg-yellow-50 text-yellow-800'
      case 'ERROR':
        return 'bg-red-50 text-red-800'
      default:
        return 'bg-gray-50 text-gray-800'
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="min-h-screen bg-gray-50 p-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="text-sm font-medium">Back to Admin Dashboard</span>
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">📋 Referral Voucher Processor</h1>
            <p className="text-gray-600 text-sm">
              Upload Excel file with referral voucher codes to automatically update referral records and mark them as voucher initiated.
            </p>
          </div>
        </div>

        {!results ? (
          <div className="bg-white rounded-2xl shadow-md p-6">
            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <h3 className="font-semibold text-blue-900 mb-2">📝 Instructions:</h3>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Export Excel file from Admin Referrals page</li>
                <li>Add voucher codes in "Referrer Voucher" and "Referee Voucher" columns for records with status "report_submitted"</li>
                <li>Only records with status "report_submitted" and non-empty voucher codes will be processed</li>
                <li>Upload the modified Excel file here to automatically update the database</li>
              </ol>
            </div>

            {/* File Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
                ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : file 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={processing}
              />
              
              <div className="space-y-4">
                {file ? (
                  <>
                    <FaFileExcel className="mx-auto text-4xl text-green-600" />
                    <div>
                      <p className="text-lg font-medium text-green-800">{file.name}</p>
                      <p className="text-sm text-green-600">
                        {(file.size / 1024).toFixed(1)} KB • Ready to process
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FaUpload className="mx-auto text-4xl text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your Excel file here or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports .xlsx and .xls files (max 10MB)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {file && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={processFile}
                  disabled={processing}
                  className="button-gradient px-6 py-3 disabled:opacity-60 flex items-center gap-2"
                >
                  {processing ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      Process Referral File
                    </>
                  )}
                </button>
                <button
                  onClick={resetProcessor}
                  disabled={processing}
                  className="px-6 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-600 text-white rounded-2xl p-4">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-sm opacity-90">Total Records</div>
                </div>
                <div className="bg-purple-600 text-white rounded-2xl p-4">
                  <div className="text-2xl font-bold">{results.processed}</div>
                  <div className="text-sm opacity-90">Processed</div>
                </div>
                <div className="bg-green-600 text-white rounded-2xl p-4">
                  <div className="text-2xl font-bold">{results.updated}</div>
                  <div className="text-sm opacity-90">Updated</div>
                </div>
                <div className="bg-yellow-600 text-white rounded-2xl p-4">
                  <div className="text-2xl font-bold">{results.skipped}</div>
                  <div className="text-sm opacity-90">Skipped</div>
                </div>
                <div className="bg-red-600 text-white rounded-2xl p-4">
                  <div className="text-2xl font-bold">{results.errors}</div>
                  <div className="text-sm opacity-90">Errors</div>
                </div>
              </div>

              {/* Processing Complete Message */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="text-2xl text-green-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Processing Complete!</h2>
                      <p className="text-gray-600">
                        Successfully processed {results.updated} out of {results.total} records
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetProcessor}
                    className="button-gradient px-4 py-2"
                  >
                    Process Another File
                  </button>
                </div>
              </div>

              {/* Activity Logs */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">📋 Activity Logs</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3">Row</th>
                        <th className="text-left p-3">Referrer Phone</th>
                        <th className="text-left p-3">Referee Phone</th>
                        <th className="text-left p-3">Action</th>
                        <th className="text-left p-3">Referrer Voucher</th>
                        <th className="text-left p-3">Referee Voucher</th>
                        <th className="text-left p-3">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.logs.map((log, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="p-3">{log.row}</td>
                          <td className="p-3 font-mono text-xs">{log.referrerPhone}</td>
                          <td className="p-3 font-mono text-xs">{log.refereePhone}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {log.referrerVoucher && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-xs">
                                {log.referrerVoucher}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.refereeVoucher && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono text-xs">
                                {log.refereeVoucher}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600">{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
