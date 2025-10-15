import { useMemo, useState } from 'react'
import CameraScanner from '@/components/CameraScanner'
import { motion } from 'framer-motion'
import { FaBarcode, FaStore, FaMobileAlt, FaListAlt, FaRupeeSign, FaIdBadge } from 'react-icons/fa'
import { getAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

const PLAN_PRICES: Record<string, number> = {
  Silver: 99,
  Gold: 199,
  Platinum: 299,
}

export function SecDashboard() {
  const auth = getAuth()
  const secId = auth?.secId ?? 'SEC12345'
  const [store, setStore] = useState('')
  const [device, setDevice] = useState('')
  const [planType, setPlanType] = useState('')
  const planPrice = useMemo(() => (planType ? PLAN_PRICES[planType] : 0), [planType])
  const [imei, setImei] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [scanning, setScanning] = useState(false)
  const navigate = useNavigate()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1500)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="text-sm mb-2">👋 Hi, <span className="font-semibold">{secId}</span></div>
      <h2 className="text-lg font-semibold">SEC Dashboard</h2>
      <p className="text-xs text-gray-500">Submit your plan sales below or view your reports.</p>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1">SEC ID</label>
          <div className="relative">
            <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input readOnly value={secId} className="w-full pl-10 pr-3 py-3 border rounded-2xl bg-gray-100" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Store Name</label>
          <div className="relative">
            <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full pl-10 pr-3 py-3 border rounded-2xl">
              <option value="" disabled>Select store</option>
              <option>Store A</option>
              <option>Store B</option>
              <option>Store C</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Device Name</label>
          <div className="relative">
            <FaMobileAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={device} onChange={(e) => setDevice(e.target.value)} className="w-full pl-10 pr-3 py-3 border rounded-2xl">
              <option value="" disabled>Select device</option>
              <option>Device X</option>
              <option>Device Y</option>
              <option>Device Z</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Type</label>
          <div className="relative">
            <FaListAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={planType} onChange={(e) => setPlanType(e.target.value)} className="w-full pl-10 pr-3 py-3 border rounded-2xl">
              <option value="" disabled>Select plan</option>
              {Object.keys(PLAN_PRICES).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Price</label>
          <div className="relative">
            <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input readOnly value={planPrice || ''} className="w-full pl-10 pr-3 py-3 border rounded-2xl bg-gray-100" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">IMEI Number</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full px-3 py-3 border rounded-2xl"
                placeholder="Scan or enter IMEI"
              />
            </div>
            <button type="button" onClick={() => setScanning((s) => !s)} className="button-gradient px-4 flex items-center gap-2">
              <FaBarcode /> Scan
            </button>
          </div>
          {scanning && (
            <CameraScanner
              onDetected={(value, parsed) => {
                const imei = parsed ?? value
                if (imei) setImei(imei)
                setScanning(false)
              }}
              onClose={() => setScanning(false)}
            />
          )}
        </div>

        <p className="text-xs italic text-gray-500">Any incorrect sales reported will impact your future incentives.</p>

        <button type="submit" className="button-gradient w-full py-3">Submit Report</button>
      </form>

      <button onClick={() => navigate('/report')} className="button-gradient w-full py-3 mt-3">Open Reports</button>

      {showToast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full shadow">✅ Report submitted successfully</div>
        </div>
      )}
    </motion.div>
  )
}
