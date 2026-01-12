import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { config } from '@/lib/config'
import { FaArrowLeft } from 'react-icons/fa'

interface ScreenshotEvent {
  id: string
  secId: string
  phone?: string
  eventType: string
  details: string
  createdAt: string
}

export function AdminScreenshots() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionToken = searchParams.get('sessionToken') || ''
  const secId = searchParams.get('secId') || ''
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    const loadScreenshots = async () => {
      if (!sessionToken && !secId) {
        setLoading(false)
        return
      }

      try {
        console.log('📸 Fetching screenshots for sessionToken:', sessionToken, 'secId:', secId)

        // Fetch test submission to get screenshotUrls directly
        const res = await fetch(`${config.apiUrl}/test-submissions`)
        const data = await res.json()

        if (data.success && data.data) {
          console.log('📸 Total submissions found:', data.data.length)

          // Find the submission matching this sessionToken or secId
          const submission = data.data.find((sub: any) =>
            sub.sessionToken === sessionToken ||
            (secId && sub.secId === secId)
          )

          if (submission) {
            console.log('📸 Found submission:', submission.id)
            console.log('📸 Screenshot URLs in submission:', submission.screenshotUrls)

            // Get screenshots directly from screenshotUrls field
            const imageUrls = submission.screenshotUrls || []

            console.log('📸 Total screenshots:', imageUrls.length)
            setScreenshots(imageUrls)
          } else {
            console.log('📸 No submission found for sessionToken:', sessionToken, 'or secId:', secId)
            setScreenshots([])
          }
        } else {
          console.log('📸 Failed to fetch submissions:', data)
          setScreenshots([])
        }
      } catch (error) {
        console.error('❌ Error loading screenshots:', error)
        setScreenshots([])
      } finally {
        setLoading(false)
      }
    }

    loadScreenshots()
  }, [sessionToken, secId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading screenshots...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/admin/test-results')}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FaArrowLeft size={16} />
          Back to Test Results
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Screenshots - SEC ID: {secId}</h1>
      </div>

      {screenshots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">📸</div>
          <h3 className="text-lg font-medium mb-2 text-gray-700">No Screenshots Available</h3>
          <p className="text-gray-500">No proctoring screenshots were captured during this test.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">
              Total screenshots captured: <strong>{screenshots.length}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screenshots.map((url, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedImage(url)}
              >
                <div className="aspect-video relative bg-gray-100">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif"%3EImage not available%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500">Screenshot #{index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Full size screenshot"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={selectedImage}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Open in New Tab
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
