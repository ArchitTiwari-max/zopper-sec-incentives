import { useEffect, useMemo, useState } from 'react'
import CameraScanner from '@/components/CameraScanner'
import { ProfileModal } from '@/components/ProfileModal'
import { motion } from 'framer-motion'
import { FaBarcode, FaStore, FaMobileAlt, FaListAlt, FaIdBadge, FaSpinner, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isSECUser, SECAuthData } from '@/lib/auth'
import { 
  fetchStores, 
  fetchSamsungSKUs, 
  fetchPlansForSKU, 
  formatPlanType,
  formatPrice,
  type Store, 
  type SamsungSKU, 
  type Plan 
} from '@/lib/api'
import SearchableSelect from '@/components/SearchableSelect'
import { config } from '@/lib/config'
import SecDeductionsBell from '@/components/SecDeductionsBell'

export function SecDashboard() {
  const { auth, logout, user, updateUser } = useAuth()
  const navigate = useNavigate()
  
  const secUser = user && isSECUser(user) ? user : null
  const secId = secUser?.secId || null
  const [store, setStore] = useState('')
  const [device, setDevice] = useState('')
  const [planType, setPlanType] = useState('')
  const [imei, setImei] = useState('')
  // IST date helpers
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const DAY_MS = 24 * 60 * 60 * 1000
  const nowUtcMs = Date.now()
  const nowIstMs = nowUtcMs + IST_OFFSET_MS
  const formatDMYFromISTMs = (istMs: number) => {
    const d = new Date(istMs)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}-${mm}-${yyyy}`
  }
  const todayLabel = formatDMYFromISTMs(nowIstMs)
  const yesterdayLabel = formatDMYFromISTMs(nowIstMs - DAY_MS)
  const [dateOfSale, setDateOfSale] = useState<string>(todayLabel)
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [congratsAmount, setCongratsAmount] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  // Force re-render at midnight so today/yesterday labels update without refresh
  const [dateTick, setDateTick] = useState(0)
  useEffect(() => {
    // Compute ms until next midnight in IST
    const utcNow = Date.now()
    const istNow = new Date(utcNow + IST_OFFSET_MS)
    const nextMidnightIstUtcMs = Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + 1,
      0, 0, 0, 0
    ) - IST_OFFSET_MS
    const ms = Math.max(1000, nextMidnightIstUtcMs - utcNow)
    const t = setTimeout(() => setDateTick((v) => v + 1), ms)
    return () => clearTimeout(t)
  }, [dateTick])
  // Update date options when day changes but don't force reset
  useEffect(() => {
    // Only reset if the current date is no longer valid (neither today nor yesterday)
    if (dateOfSale !== todayLabel && dateOfSale !== yesterdayLabel) {
      setDateOfSale(todayLabel)
    }
  }, [dateTick, todayLabel, yesterdayLabel, dateOfSale])
  
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }
  
  const handleProfileUpdated = (updatedUser: SECAuthData) => {
    updateUser(updatedUser)
  }
  
  // State for API data
  const [stores, setStores] = useState<Store[]>([])
  const [samsungSKUs, setSamsungSKUs] = useState<SamsungSKU[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState({
    stores: false,
    skus: false,
    plans: false,
    submit: false
  })

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      setLoading(prev => ({ ...prev, stores: true }))
      const response = await fetchStores()
      if (response.success) {
        setStores(response.data)
      } else {
        console.error('Failed to load stores:', response.error)
      }
      setLoading(prev => ({ ...prev, stores: false }))
    }
    loadStores()
  }, [])
  
  // Load Samsung SKUs on component mount
  useEffect(() => {
    const loadSKUs = async () => {
      setLoading(prev => ({ ...prev, skus: true }))
      const response = await fetchSamsungSKUs()
      if (response.success) {
        setSamsungSKUs(response.data)
      } else {
        console.error('Failed to load Samsung SKUs:', response.error)
      }
      setLoading(prev => ({ ...prev, skus: false }))
    }
    loadSKUs()
  }, [])

  // Custom ordering for Device Name dropdown
  const DEVICE_PRIORITY_LIST: Array<[string, string]> = [
    ['Luxury Fold', 'Z Fold 6'],
    ['Luxury Fold', 'Z Fold 7'],
    ['Luxury Flip', 'Z Flip 7'],
    ['Luxury Flip', 'Z Flip 6'],
    ['Luxury Flip', 'Z Flip FE'],
    ['Super Premium', 'S25'],
    ['Super Premium', 'S25 +'],
    ['Super Premium', 'S25 Ultra'],
    ['Super Premium', 'S25 Edge'],
    ['Super Premium', 'S24'],
    ['Super Premium', 'S24 +'],
    ['Super Premium', 'S24 Ultra'],
    ['Premium', 'A55'],
    ['Premium', 'A56'],
    ['Premium', 'S25 FE'],
    ['High', 'A26'],
    ['High', 'A36'],
    ['High', 'M56'],
    ['Mid', 'A16'],
    ['Mid', 'F16'],
    ['Mid', 'F17'],
    ['Mid', 'A17'],
    ['Mass', 'F15'],
    ['Mass', 'A06'],
  ]
  const CATEGORY_ORDER = ['Luxury Fold', 'Luxury Flip', 'Super Premium', 'Premium', 'High', 'Mid', 'Mass']
  const priorityKey = (sku: SamsungSKU) => `${sku.Category}|||${sku.ModelName}`
  const priorityIndex = useMemo(() => {
    const m = new Map<string, number>()
    DEVICE_PRIORITY_LIST.forEach(([cat, model], i) => m.set(`${cat}|||${model}`, i))
    return m
  }, [])
  const categoryIndex = (cat: string) => {
    const i = CATEGORY_ORDER.indexOf(cat)
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  const sortedSKUs = useMemo(() => {
    const byLabel = (s: SamsungSKU) => `${s.Category} - ${s.ModelName}`
    return [...samsungSKUs].sort((a, b) => {
      const ra = priorityIndex.get(priorityKey(a))
      const rb = priorityIndex.get(priorityKey(b))
      const aHas = ra !== undefined
      const bHas = rb !== undefined
      if (aHas && bHas) return (ra as number) - (rb as number)
      if (aHas) return -1
      if (bHas) return 1
      const ca = categoryIndex(a.Category)
      const cb = categoryIndex(b.Category)
      if (ca !== cb) return ca - cb
      return byLabel(a).localeCompare(byLabel(b), 'en', { numeric: true, sensitivity: 'base' })
    })
  }, [samsungSKUs, priorityIndex])
  
  // Load plans when device changes
  useEffect(() => {
    if (device) {
      const loadPlans = async () => {
        setLoading(prev => ({ ...prev, plans: true }))
        const response = await fetchPlansForSKU(device)
        if (response.success) {
          setAvailablePlans(response.data)
        } else {
          console.error('Failed to load plans:', response.error)
          setAvailablePlans([])
        }
        setLoading(prev => ({ ...prev, plans: false }))
      }
      loadPlans()
    } else {
      setAvailablePlans([])
    }
    // Reset plan selection when device changes
    setPlanType('')
  }, [device])
  
  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!store || !device || !planType || !imei) {
      setShowToast({ type: 'error', message: 'Please fill in all fields' })
      setTimeout(() => setShowToast(null), 3000)
      return
    }
    // Basic IMEI validation (10-20 digits)
    if (!/^\d{10,20}$/.test(imei.trim())) {
      setShowToast({ type: 'error', message: 'Enter a valid IMEI (10-20 digits)' })
      setTimeout(() => setShowToast(null), 3000)
      return
    }

    if (!auth?.token) {
      setShowToast({ type: 'error', message: 'Authentication required' })
      setTimeout(() => setShowToast(null), 3000)
      return
    }

    // Open confirmation modal instead of immediate submit
    setShowConfirm(true)
  }

  const performSubmit = async () => {
    if (!auth?.token) return
    setLoading(prev => ({ ...prev, submit: true }))
    try {
      const response = await fetch(`${config.apiUrl}/sec/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          storeId: store,
          samsungSKUId: device,
          planId: availablePlans.find(p => p.planType === planType)?.id,
          imei: imei.trim(),
          dateOfSale
        })
      })

      const data = await response.json()

      if (data.success) {
        // Close confirmation and reset form
        setShowConfirm(false)
        setStore('')
        setDevice('')
        setPlanType('')
        setImei('')
        setDateOfSale(todayLabel)

        // Show congratulations modal with incentive amount
        const earned = data?.data?.incentiveEarned ?? data?.incentiveEarned ?? 0
        setCongratsAmount(earned)
      } else {
        const msg = (data.message || '').toLowerCase()
        if (msg.includes('duplicate') || msg.includes('exists')) {
          setShowToast({ type: 'error', message: 'IMEI already exists — duplicate entry not allowed.' })
        } else {
          setShowToast({ type: 'error', message: data.message || 'Failed to submit' })
        }
        setTimeout(() => setShowToast(null), 3000)
      }
    } catch (error: any) {
      const msg = (error?.message || '').toLowerCase()
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setShowToast({ type: 'error', message: 'IMEI already exists — duplicate entry not allowed.' })
      } else {
        setShowToast({ type: 'error', message: 'Network error. Please try again.' })
      }
      setTimeout(() => setShowToast(null), 3000)
    } finally {
      setLoading(prev => ({ ...prev, submit: false }))
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-lg font-semibold">Plan Sell Info</h2>
          <p className="text-xs text-gray-500">Submit your plan sales below or view your reports.</p>
          {!secId && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors w-full text-left"
            >
              <p className="text-xs text-yellow-700">
                ⚠️ Please complete your profile by setting your SEC ID
                <span className="ml-1 underline">Click here</span>
              </p>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><span className="sr-only">Notifications</span></div>
          {/* Notification bell for invalid IMEI deductions */}
          {/* Placed next to Logout at top-right of the dashboard */}
          <SecDeductionsBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <FaSignOutAlt size={12} />
            Logout
          </button>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1">SEC ID</label>
          <div className="relative">
            <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              readOnly 
              value={secId || ''} 
              placeholder={secId ? '' : 'SEC ID not set - complete profile'}
              className={`w-full pl-10 pr-3 py-3 border rounded-2xl ${
                secId ? 'bg-gray-100' : 'bg-yellow-50 border-yellow-300'
              }`} 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date of Sale</label>
          <select
            value={dateOfSale}
            onChange={(e) => setDateOfSale(e.target.value)}
            className="w-full px-3 py-3 border rounded-2xl"
          >
            <option value={todayLabel}>{todayLabel}</option>
            <option value={yesterdayLabel}>{yesterdayLabel}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Store Name</label>
          <SearchableSelect
            value={store}
            onChange={setStore}
            options={stores.map(s => ({ value: s.id, label: `${s.storeName} - ${s.city}` }))}
            placeholder={loading.stores ? 'Loading stores...' : 'Search or select store'}
            disabled={loading.stores}
            leftIcon={<FaStore />}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Device Name</label>
          <SearchableSelect
            value={device}
            onChange={setDevice}
            options={sortedSKUs.map(sku => ({ value: sku.id, label: `${sku.Category} - ${sku.ModelName}` }))}
            placeholder={loading.skus ? 'Loading devices...' : 'Search or select device'}
            disabled={loading.skus}
            leftIcon={<FaMobileAlt />}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan Type</label>
          <SearchableSelect
            value={planType}
            onChange={setPlanType}
            options={availablePlans
              .filter(p => p.planType !== 'Extended_Warranty_1_Yr' && p.planType !== 'Screen_Protect_1_Yr')
              .map(p => ({ value: p.planType, label: `${formatPlanType(p.planType)}` }))}
            placeholder={!device ? 'Select device first' : loading.plans ? 'Loading plans...' : 'Search or select plan'}
            disabled={loading.plans || !device}
            leftIcon={<FaListAlt />}
          />
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

        <button 
          type="submit" 
          className="button-gradient w-full py-3 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading.submit}
        >
          {loading.submit ? (
            <>
              <FaSpinner className="animate-spin" size={14} />
              Submitting...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>

      <button onClick={() => navigate('/reporting')} className="button-gradient w-full py-3 mt-3">View Incentive Passbook</button>
      
      <button 
        onClick={() => navigate('/leaderboard')} 
        className="w-full py-3 mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
      >
        <span className="text-xl">🏆</span>
        View Leaderboard
      </button>

      {showToast && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <div className={`${showToast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-4 py-2 rounded-full shadow`}>
            {showToast.message}
          </div>
        </div>
      )}
      
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {showConfirm && (
        <ConfirmModal
          details={{
            secId: secId || '',
            dateOfSale,
            storeLabel: stores.find(s => s.id === store) ? `${stores.find(s => s.id === store)!.storeName} - ${stores.find(s => s.id === store)!.city}` : '',
            deviceLabel: (() => {
              const sku = samsungSKUs.find(s => s.id === device)
              return sku ? `${sku.Category} - ${sku.ModelName}` : ''
            })(),
            planLabel: planType ? formatPlanType(planType) : '',
            planPrice: (() => {
              const p = availablePlans.find(p => p.planType === planType)
              return p ? formatPrice(p.price) : ''
            })(),
            imei: imei.trim(),
          }}
          onCancel={() => setShowConfirm(false)}
          onConfirm={performSubmit}
          loading={loading.submit}
        />
      )}

      {congratsAmount !== null && (
        <CongratsModal
          amount={congratsAmount}
          onClose={() => {
            setCongratsAmount(null)
            navigate('/reporting', { replace: true })
          }}
        />
      )}
    </motion.div>
  )
}

function ConfirmModal({
  details,
  onCancel,
  onConfirm,
  loading,
}: {
  details: {
    secId: string
    dateOfSale: string
    storeLabel: string
    deviceLabel: string
    planLabel: string
    planPrice: string
    imei: string
  }
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-1">Confirm Plan Sale</h3>
        <p className="text-sm text-gray-500 mb-4">Review the details below before submitting.</p>

        <div className="space-y-2 text-sm">
          <Row label="SEC ID" value={details.secId || '-'} />
          <Row label="Date of Sale" value={details.dateOfSale} />
          <Row label="Store Name" value={details.storeLabel} />
          <Row label="Device" value={details.deviceLabel} />
          <Row label="Plan Type" value={details.planLabel} />
          <Row label="Plan Price" value={details.planPrice || '-'} />
          <Row label="IMEI" value={details.imei} mono />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="button-gradient py-2 rounded-xl disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-gray-500">{label}</div>
      <div className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

function CongratsModal({ amount, onClose }: { amount: number; onClose: () => void }) {
  const pieces = Array.from({ length: 40 })
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 97) % 100}%`,
              backgroundColor: colors[i % colors.length],
              animationDelay: `${(i % 10) * 0.15}s`,
              animationDuration: `${4 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
        <div className="text-2xl mb-2">🎉 Congratulations!</div>
        <div className="text-gray-700">You've earned <span className="font-semibold">₹{amount}</span> incentive!</div>
        <button onClick={onClose} className="button-gradient w-full py-3 mt-4">View Incentive Passbook</button>
      </div>
    </div>
  )
}
