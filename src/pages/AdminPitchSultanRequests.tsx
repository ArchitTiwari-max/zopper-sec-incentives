import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaSpinner, FaCheck, FaTimes, FaPlay, FaVideo } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'

interface PitchVideo {
    id: string
    title: string
    url: string // or videoUrl
    thumbnail: string
    uploaderName: string
    uploaderPhone: string
    storeName: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    description?: string
}

export function AdminPitchSultanRequests() {
    const { auth } = useAuth()
    const navigate = useNavigate()

    const [videos, setVideos] = useState<PitchVideo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Mock data for initial development - replace with actual API fetch
    const fetchVideos = async () => {
        if (!auth?.token) return

        try {
            setLoading(true)
            // UNCOMMENT WHEN API IS READY
            // const response = await authFetch(`${config.apiUrl}/pitch-sultan/admin/videos?status=PENDING`, {
            //   headers: { 'Authorization': `Bearer ${auth.token}` }
            // })
            // const result = await response.json()
            // if (result.success) setVideos(result.data)

            // MOCK DATA
            setTimeout(() => {
                setVideos([
                    {
                        id: '1',
                        title: "How to Sell Godrej ACs like a Pro! ❄️",
                        url: "https://www.youtube.com/watch?v=example",
                        thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop",
                        uploaderName: "Amit Sharma",
                        uploaderPhone: "9876543210",
                        storeName: "Vijay Sales, Delhi",
                        status: 'PENDING',
                        createdAt: new Date().toISOString(),
                        description: "This is my entry for the best pitch contest."
                    },
                    {
                        id: '2',
                        title: "Pitching the New Warranty Plan 🛡️",
                        url: "#",
                        thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1000&auto=format&fit=crop",
                        uploaderName: "Priya Singh",
                        uploaderPhone: "9988776655",
                        storeName: "Croma, Mumbai",
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                    }
                ])
                setLoading(false)
            }, 1000)

        } catch (error) {
            console.error('Error fetching videos:', error)
            setError('Failed to fetch videos')
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVideos()
    }, [])

    const handleAction = async (videoId: string, action: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to ${action} this video?`)) return

        setProcessingId(videoId)
        try {
            // UNCOMMENT WHEN API IS READY
            // const response = await authFetch(`${config.apiUrl}/pitch-sultan/videos/${videoId}/status`, {
            //   method: 'PUT',
            //   headers: {
            //     'Content-Type': 'application/json',
            //     'Authorization': `Bearer ${auth.token}`
            //   },
            //   body: JSON.stringify({ status: action }) // 'APPROVED' or 'REJECTED'
            // })
            // const result = await response.json()

            // MOCK SUCCESS
            await new Promise(resolve => setTimeout(resolve, 800))

            // Remove from list or update status
            setVideos(prev => prev.filter(v => v.id !== videoId))

            alert(`Video ${action === 'APPROVED' ? 'Approved' : 'Rejected'} successfully!`)
        } catch (error) {
            console.error('Error updating video status:', error)
            alert('Failed to update status')
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
                    <span className="text-gray-600">Loading Pitch Sultan requests...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="bg-gradient-to-tr from-amber-400 to-yellow-600 text-white p-2 rounded-lg text-sm">PS</span>
                        Pitch Sultan Approvals
                    </h1>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="text-blue-600 hover:underline"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                {videos.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaVideo className="text-gray-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Pending Requests</h3>
                        <p className="text-gray-500 mt-1">All video submissions have been processed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map((video, index) => (
                            <div key={video.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                                {/* Video Thumbnail / Player Placeholder */}
                                <div className="aspect-video bg-gray-900 relative group">
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <a href={video.url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                                            <FaPlay className="text-white ml-1" />
                                        </a>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                        {new Date(video.createdAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="text-xs font-mono text-gray-400 mb-1">#{1001 + index}</div>
                                    <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1" title={video.title}>{video.title}</h3>
                                    <div className="text-sm text-gray-500 mb-3 flex flex-col gap-0.5">
                                        <span className="font-medium text-gray-700">{video.uploaderName}, {video.storeName}</span>
                                        <span className="text-xs">{video.uploaderPhone}</span>
                                    </div>

                                    {video.description && (
                                        <p className="text-xs text-gray-500 mb-4 line-clamp-2 bg-gray-50 p-2 rounded">
                                            {video.description}
                                        </p>
                                    )}

                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            onClick={() => handleAction(video.id, 'APPROVED')}
                                            disabled={processingId === video.id}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === video.id ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleAction(video.id, 'REJECTED')}
                                            disabled={processingId === video.id}
                                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === video.id ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    )
}
