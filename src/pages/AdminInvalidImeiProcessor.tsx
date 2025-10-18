import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaUpload, FaSpinner, FaArrowLeft } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { config } from '@/lib/config'

interface ProcessResult {
  total: number
  processed: number
  deducted: number
  errors: number
  skipped: number
  notificationsSent: number
  logs: Array<{
    row: number
    imei: string
    action: string
    success: boolean
    message: string
    secUser: any
    deductionAmount: number
  }>
  summary: {
    deductedReports: any[]
    errorReports: any[]
    skippedReports: any[]
  }
}

export function AdminInvalidImeiProcessor() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const processFile = async () => {
    if (!file || !auth?.token) return

    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('excel', file)

      const response = await fetch(`${config.apiUrl}/admin/process-invalid-imeis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.message || 'Failed to process file')
      }
    } catch (error) {
      console.error('Error processing file:', error)
      setError('Network error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const resetProcessor = () => {
    setFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white shadow-md p-4 mx-4 my-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft size={16} />
              Back to Dashboard
            </button>
            <div className="h-6 border-l border-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-800">Process Invalid IMEIs</h1>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload an Excel file (.xlsx or .xls) containing invalid IMEIs</li>
            <li>• The Excel file should have a column named "IMEI" (or "imei", "Imei", "IMEI Number")</li>
            <li>• System will find which SEC submitted each IMEI and deduct the plan price from their incentive</li>
            <li>• WhatsApp notifications will be sent to affected SECs automatically</li>
            <li>• You'll see a detailed summary of all processed entries</li>
          </ul>
        </div>

        {/* File Upload Section */}
        {!result && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <div className="mb-4">
              <FaUpload className="text-4xl text-gray-400 mx-auto mb-2" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Upload Invalid IMEI Excel File
              </p>
              <p className="text-sm text-gray-500">
                Select an Excel file containing invalid IMEIs to process deductions
              </p>
            </div>
            
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <FaUpload size={16} />
              Choose Excel File
            </label>

            {file && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Selected File:</p>
                <p className="text-sm text-gray-600">{file.name}</p>
                <p className="text-xs text-gray-500">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={processFile}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? (
                      <>
                        <FaSpinner className="animate-spin" size={16} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaUpload size={16} />
                        Process File
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetProcessor}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-medium mb-1">Error:</div>
            <div className="text-red-700">{error}</div>
            <button
              onClick={resetProcessor}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <StatCard title="Total Rows" value={result.total.toString()} color="blue" />
              <StatCard title="Processed" value={result.processed.toString()} color="gray" />
              <StatCard title="Deducted" value={result.deducted.toString()} color="red" />
              <StatCard title="Skipped" value={result.skipped.toString()} color="yellow" />
              <StatCard title="Errors" value={result.errors.toString()} color="red" />
              <StatCard title="Notifications" value={result.notificationsSent.toString()} color="green" />
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-800 mb-2">Processing Complete!</div>
              <div className="text-green-700">
                Successfully processed {result.deducted} invalid IMEIs and sent {result.notificationsSent} WhatsApp notifications to affected SECs.
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800">Detailed Processing Log</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">IMEI</th>
                      <th className="px-4 py-2 text-left">Action</th>
                      <th className="px-4 py-2 text-left">SEC</th>
                      <th className="px-4 py-2 text-left">Deduction</th>
                      <th className="px-4 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.logs.map((log, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{log.row}</td>
                        <td className="px-4 py-2 font-mono text-xs">{log.imei}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'DEDUCT' ? 'bg-red-100 text-red-700' :
                            log.action === 'SKIP' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {log.secUser ? (log.secUser.secId || log.secUser.phone) : '-'}
                        </td>
                        <td className="px-4 py-2">
                          {log.deductionAmount > 0 ? `₹${log.deductionAmount}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetProcessor}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Process Another File
              </button>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-700',
    gray: 'bg-gradient-to-r from-gray-500 to-gray-700',
    red: 'bg-gradient-to-r from-red-500 to-red-700',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-700',
    green: 'bg-gradient-to-r from-green-500 to-green-700'
  }

  return (
    <div className={`rounded-lg p-3 text-white shadow-md ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-xs opacity-90">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  )
}