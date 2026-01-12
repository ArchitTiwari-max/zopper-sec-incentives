import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStores, Store } from '@/lib/api'
import { extractPhoneFromUrl, validateTestToken } from '@/lib/testToken'
import { FaStore, FaSearch, FaCheckCircle, FaTimes, FaMapMarkerAlt } from 'react-icons/fa'

export function TestStoreSelection() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const phoneNum = extractPhoneFromUrl()
      if (!phoneNum) { navigate('/'); return; }

      const isValid = await validateTestToken(phoneNum)
      if (!isValid) { navigate('/'); return; }

      setPhone(phoneNum)

      try {
        const response = await fetchStores()
        if (response.success && response.data) {
          setStores(response.data)
        } else {
          setError('Failed to load stores')
        }
      } catch (err) {
        setError('Failed to load stores')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [navigate])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStores = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return stores.filter(store =>
      store.storeName.toLowerCase().includes(lowerSearch) ||
      (store.city && store.city.toLowerCase().includes(lowerSearch))
    )
  }, [stores, searchTerm])

  const handleContinue = () => {
    if (!selectedStore) {
      setError('Please select a store to continue')
      return
    }

    navigate(`/test?phone=${phone}`, {
      state: {
        stores: [{
          id: selectedStore.id,
          storeName: selectedStore.storeName,
          city: selectedStore.city
        }]
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-[#0B2C5F] p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
            <FaStore className="text-2xl" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Select Your Store</h1>
          <p className="text-blue-100 text-sm">Search and choose your store location</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <span className="shrink-0 text-lg">⚠️</span>
              {error}
            </div>
          )}

          <div className="mb-8 relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Store Location
            </label>

            {/* Search Dropdown Input */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10">
                <FaSearch />
              </div>
              <input
                type="text"
                placeholder="Search by store name or city..."
                value={selectedStore && !isOpen ? selectedStore.storeName : searchTerm}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsOpen(true)
                  if (selectedStore) setSelectedStore(null)
                }}
                className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900"
              />

              {/* Clear/Arrow Icon */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {(searchTerm || selectedStore) && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedStore(null); }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <FaTimes size={14} />
                  </button>
                )}
                <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredStores.length > 0 ? (
                    filteredStores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setSelectedStore(store)
                          setSearchTerm('')
                          setIsOpen(false)
                          setError(null)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group border-b border-gray-50 last:border-0"
                      >
                        <div className="shrink-0 mt-1 text-gray-400 group-hover:text-blue-500">
                          <FaMapMarkerAlt />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight mb-0.5">{store.storeName}</div>
                          {store.city && <div className="text-xs text-gray-500">{store.city}</div>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500 italic">
                      No stores found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selectedStore}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${selectedStore
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            {selectedStore && <FaCheckCircle className="animate-in zoom-in" />}
            Continue to Test
          </button>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-widest mr-2">Verified:</span>
              <span className="text-sm font-semibold text-gray-600">{phone}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
