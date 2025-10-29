import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStores, Store } from '@/lib/api'
import { extractPhoneFromUrl, validateTestToken } from '@/lib/testToken'

export function TestStoreSelection() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      // Validate test token first
      const phoneNum = extractPhoneFromUrl()
      if (!phoneNum) {
        navigate('/')
        return
      }

      const isValid = await validateTestToken(phoneNum)
      if (!isValid) {
        navigate('/')
        return
      }

      setPhone(phoneNum)

      // Fetch stores
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

  const handleContinue = () => {
    if (!selectedStore) {
      setError('Please select a store to continue')
      return
    }

    const store = stores.find(s => s.id === selectedStore)
    if (!store) return

    // Navigate to test page with store info
    navigate(`/test?phone=${phone}`, {
      state: { 
        store: {
          id: store.id,
          storeName: store.storeName,
          city: store.city
        }
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Your Store</h1>
          <p className="text-gray-600">Please select your store before starting the test</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-2">
            Store
          </label>
          <select
            id="store"
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value)
              setError(null)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.storeName} - {store.city}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedStore}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          Continue to Test
        </button>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Phone: {phone}</p>
        </div>
      </div>
    </div>
  )
}
