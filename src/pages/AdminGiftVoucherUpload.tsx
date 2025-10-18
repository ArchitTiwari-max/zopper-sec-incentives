import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaUpload, FaSpinner, FaCheckCircle, FaTimesCircle, FaList } from 'react-icons/fa'
import { config } from '@/lib/config'

interface InvalidRecord {
  imei: string
  uploadedBy: string
  uploadTime: string
  status: string
}

interface UploadSummary {
  totalUploaded: number
  validEntries: number
  invalidImeis: number
  invalidRecords: InvalidRecord[]
}

export function AdminGiftVoucherUpload() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [summary, setSummary] = useState<UploadSummary | null>(null)
  const [showInvalid, setShowInvalid] = useState(false)
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
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return
    if (!/\.(xlsx|xls)$/i.test(dropped.name)) {
      alert('Please upload an Excel file (.xlsx or .xls)')
      return
    }
    setFile(dropped)
    setSummary(null)
  }, [])

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      alert('Please upload an Excel file (.xlsx or .xls)')
      return
    }
    setFile(f)
    setSummary(null)
  }

  const upload = async () => {
    if (!file || !auth?.token) return
    setProcessing(true)
    try {
      const form = new FormData()
      form.append('excel', file)
      const res = await fetch(`${config.apiUrl}/admin/gift-vouchers/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        body: form
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.message || 'Upload failed')
        return
      }
      setSummary(json.data as UploadSummary)
    } catch (err) {
      console.error(err)
      alert('Network error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setSummary(null)
    setShowInvalid(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2">
            <FaArrowLeft className="text-sm" /> Back to Admin Dashboard
          </button>
          <h1 className="text-xl font-semibold">Admin Gift Voucher Upload (IMEI-wise)</h1>
          <p className="text-sm text-gray-500">Upload Excel with IMEI-wise voucher data; system will validate each IMEI against submitted sales.</p>
        </div>

        {!summary ? (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="mb-4 text-sm text-gray-600">
              Expected columns: IMEI, optional Voucher Code, optional SEC ID / Phone for notification.
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center ${dragOver ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input type="file" accept=".xlsx,.xls" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="space-y-2">
                <div className="text-4xl text-gray-400"><FaUpload /></div>
                <div className="text-gray-700">{file ? file.name : 'Drop Excel here or click to browse'}</div>
                {file && <div className="text-xs text-gray-500">{(file.size/1024).toFixed(1)} KB</div>}
              </div>
            </div>
            {file && (
              <div className="mt-4 flex gap-2">
                <button onClick={upload} disabled={processing} className="button-gradient px-5 py-2 flex items-center gap-2 disabled:opacity-60">
                  {processing ? <FaSpinner className="animate-spin" /> : <FaUpload />} {processing ? 'Uploading...' : 'Upload & Validate'}
                </button>
                <button onClick={reset} disabled={processing} className="px-5 py-2 border rounded-2xl">Reset</button>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard title="Total Uploaded" value={summary.totalUploaded} className="bg-blue-600" />
                <SummaryCard title="Valid Entries" value={summary.validEntries} className="bg-green-600" />
                <SummaryCard title="Invalid IMEIs" value={summary.invalidImeis} className="bg-red-600" />
                <div className="rounded-2xl p-4 bg-gray-800 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-90">Actions</div>
                    <div className="text-xl font-semibold">Quick</div>
                  </div>
                  <button onClick={() => setShowInvalid(true)} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2">
                    <FaList /> View Invalid IMEIs
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center gap-2 text-green-700">
                  <FaCheckCircle />
                  <div>
                    <div className="font-semibold">Upload Complete</div>
                    <div className="text-sm text-gray-600">Valid vouchers have been recorded. Invalid IMEIs are logged for review and notifications sent when possible.</div>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={reset} className="button-gradient px-4 py-2">Upload Another File</button>
                </div>
              </div>

              {showInvalid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvalid(false)} />
                  <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-semibold">Invalid IMEIs</div>
                      <button onClick={() => setShowInvalid(false)} className="text-gray-500 hover:text-gray-700"><FaTimesCircle /></button>
                    </div>
                    <div className="max-h-[60vh] overflow-auto border rounded-2xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">IMEI</th>
                            <th className="p-2 text-left">Uploaded By</th>
                            <th className="p-2 text-left">Upload Time</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.invalidRecords.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 font-mono text-xs">{r.imei}</td>
                              <td className="p-2">{r.uploadedBy}</td>
                              <td className="p-2">{new Date(r.uploadTime).toLocaleString()}</td>
                              <td className="p-2 text-red-600 font-medium">❌ {r.status}</td>
                            </tr>
                          ))}
                          {summary.invalidRecords.length === 0 && (
                            <tr><td className="p-4 text-center text-gray-500" colSpan={4}>No invalid IMEIs</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}

function SummaryCard({ title, value, className }: { title: string; value: number; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow ${className || 'bg-blue-600'}`}>
      <div className="text-xs opacity-90">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}