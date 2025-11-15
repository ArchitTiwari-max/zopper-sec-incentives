import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCrown, FaTrophy, FaMedal, FaStar, FaFire, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { authFetch } from '@/lib/http'

interface LeaderboardEntry {
  storeId: string
  storeName: string
  city: string
  totalIncentive: number
  adldIncentive: number
  comboIncentive: number
  totalSales: number
  rank: number
  rankChange?: number
  isNewToday?: boolean
}

interface UserPosition {
  storeId: string
  storeName: string
  city: string
  totalIncentive: number
  adldIncentive: number
  comboIncentive: number
  totalSales: number
  rank: number
}

export function Leaderboard() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    fetchLeaderboardData()
  }, [selectedMonth])

  const fetchLeaderboardData = async () => {
    if (!auth?.token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const url = selectedMonth 
        ? `${config.apiUrl}/leaderboard?month=${selectedMonth}`
        : `${config.apiUrl}/leaderboard`
const response = await authFetch(url, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setLeaderboard(result.data.leaderboard)
        setUserPosition(result.data.userPosition)
        setError(null)
      } else {
        setError(result.message || 'Failed to fetch leaderboard')
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <FaCrown className="text-yellow-500 text-xl" />
      case 2:
        return <FaTrophy className="text-gray-400 text-xl" />
      case 3:
        return <FaMedal className="text-amber-600 text-xl" />
      default:
        return <span className="text-gray-600 font-bold text-lg">#{rank}</span>
    }
  }

  const getTopThreeColors = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600 text-white shadow-lg transform scale-105'
      case 2:
        return 'from-gray-300 to-gray-500 text-white shadow-md'
      case 3:
        return 'from-amber-400 to-amber-600 text-white shadow-md'
      default:
        return 'from-gray-100 to-gray-200 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-white text-4xl"
        >
          🏆
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-pink-600">
        <div className="text-center text-white">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl mb-4">{error}</div>
          <button 
            onClick={fetchLeaderboardData}
            className="bg-white text-red-600 px-6 py-3 rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 w-full m-0 p-0">
      {/* Header */}
      <div className="p-3 sm:p-4 text-white">
        <button
          onClick={() => navigate(auth?.role === 'admin' ? '/admin/dashboard' : '/plan-sell-info')}
          className="flex items-center gap-2 mb-4 text-white/80 hover:text-white transition-colors text-sm"
        >
          <FaArrowLeft className="text-sm" />
          <span className="hidden xs:inline">Back to Dashboard</span>
          <span className="xs:hidden">Back</span>
        </button>
        
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-4xl sm:text-6xl mb-2"
          >
            🏆
          </motion.div>
          <h1 className="text-xl sm:text-3xl font-bold mb-2 leading-tight">Sales Champion Leaderboard</h1>
          <p className="text-white/80 text-sm sm:text-base">Who will claim the crown this month?</p>
          
          {/* Month Filter */}
          <div className="mt-4 flex justify-center">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <option value="" className="bg-purple-600 text-white">All Time</option>
              <option value="2025-01" className="bg-purple-600 text-white">January 2025</option>
              <option value="2025-02" className="bg-purple-600 text-white">February 2025</option>
              <option value="2025-03" className="bg-purple-600 text-white">March 2025</option>
              <option value="2025-04" className="bg-purple-600 text-white">April 2025</option>
              <option value="2025-05" className="bg-purple-600 text-white">May 2025</option>
              <option value="2025-06" className="bg-purple-600 text-white">June 2025</option>
              <option value="2025-07" className="bg-purple-600 text-white">July 2025</option>
              <option value="2025-08" className="bg-purple-600 text-white">August 2025</option>
              <option value="2025-09" className="bg-purple-600 text-white">September 2025</option>
              <option value="2025-10" className="bg-purple-600 text-white">October 2025</option>
              <option value="2025-11" className="bg-purple-600 text-white">November 2025</option>
              <option value="2025-12" className="bg-purple-600 text-white">December 2025</option>
            </select>
          </div>
          
          <div className="text-white/80 text-xs mt-2 flex items-center justify-center gap-3">
            <span>
              Rank movement is calculated against yesterday 23:59:59 IST.
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1" title="Improved vs yesterday 23:59:59 IST">
              <FaArrowUp className="text-green-500" /> Up = improved rank
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1" title="Dropped vs yesterday 23:59:59 IST">
              <FaArrowDown className="text-red-500" /> Down = dropped rank
            </span>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 pb-8">
        {/* Top 3 Podium */}
        {leaderboard.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6 sm:mb-8 pt-6 sm:pt-8"
          >
            <div className="flex justify-center items-end gap-0.5 sm:gap-4 mb-6 max-w-full px-1 relative">
              {/* Second Place */}
              {leaderboard[1] && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center flex-1 max-w-[30%] sm:max-w-none sm:flex-none"
                >
                  <div className="bg-gradient-to-t from-gray-300 to-gray-500 rounded-t-lg sm:rounded-t-2xl p-1 sm:p-4 h-24 sm:h-36 flex flex-col justify-end text-white shadow-lg">
                    <FaTrophy className="text-sm sm:text-2xl mb-1 sm:mb-2 mx-auto" />
                    <div className="font-bold text-[9px] sm:text-sm text-center leading-tight px-0.5 break-words hyphens-auto" style={{wordBreak: 'break-word'}}>{leaderboard[1].storeName}</div>
                    <div className="text-[8px] sm:text-xs opacity-80 text-center px-0.5 break-words" style={{wordBreak: 'break-word'}}>{leaderboard[1].city}</div>
                    <div className="text-xs sm:text-lg font-bold">₹{leaderboard[1].totalIncentive}</div>
                  </div>
                  <div className="bg-gray-400 text-white py-0.5 sm:py-2 rounded-b-lg sm:rounded-b-2xl font-bold text-[10px] sm:text-sm">#2</div>
                </motion.div>
              )}

              {/* First Place */}
              {leaderboard[0] && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center relative flex-1 max-w-[40%] sm:max-w-none sm:flex-none"
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 text-xl sm:text-4xl z-10"
                  >
                    👑
                  </motion.div>
                  <div className="bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t-lg sm:rounded-t-2xl p-1 sm:p-4 h-28 sm:h-44 flex flex-col justify-end text-white shadow-xl">
                    <FaCrown className="text-lg sm:text-3xl mb-1 sm:mb-2 mx-auto" />
                    <div className="font-bold text-[10px] sm:text-base text-center leading-tight px-0.5 break-words hyphens-auto" style={{wordBreak: 'break-word'}}>{leaderboard[0].storeName}</div>
                    <div className="text-[8px] sm:text-sm opacity-80 text-center px-0.5 break-words" style={{wordBreak: 'break-word'}}>{leaderboard[0].city}</div>
                    <div className="text-sm sm:text-xl font-bold">₹{leaderboard[0].totalIncentive}</div>
                  </div>
                  <div className="bg-yellow-500 text-white py-0.5 sm:py-2 rounded-b-lg sm:rounded-b-2xl font-bold text-[10px] sm:text-sm">CHAMPION</div>
                </motion.div>
              )}

              {/* Third Place */}
              {leaderboard[2] && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center flex-1 max-w-[30%] sm:max-w-none sm:flex-none"
                >
                  <div className="bg-gradient-to-t from-amber-400 to-amber-600 rounded-t-lg sm:rounded-t-2xl p-1 sm:p-4 h-20 sm:h-28 flex flex-col justify-end text-white shadow-lg">
                    <FaMedal className="text-xs sm:text-xl mb-1 mx-auto" />
                    <div className="font-bold text-[9px] sm:text-sm text-center leading-tight px-0.5 break-words hyphens-auto" style={{wordBreak: 'break-word'}}>{leaderboard[2].storeName}</div>
                    <div className="text-[8px] sm:text-xs opacity-80 text-center px-0.5 break-words" style={{wordBreak: 'break-word'}}>{leaderboard[2].city}</div>
                    <div className="text-xs sm:text-base font-bold">₹{leaderboard[2].totalIncentive}</div>
                  </div>
                  <div className="bg-amber-500 text-white py-0.5 sm:py-2 rounded-b-lg sm:rounded-b-2xl font-bold text-[10px] sm:text-sm">#3</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Your Position Card */}
        {userPosition ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4 sm:mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-4 text-white border border-white/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-center sm:text-left flex-1">
                <div className="text-xs sm:text-sm opacity-80">Your Best Store</div>
                <div className="font-bold text-base sm:text-lg break-words leading-tight" style={{wordBreak: 'break-word'}}>{userPosition.storeName}</div>
                <div className="text-xs sm:text-sm opacity-80 break-words" style={{wordBreak: 'break-word'}}>{userPosition.city}</div>
              </div>
              <div className="text-center sm:text-right">
                <div className="flex items-center justify-center sm:justify-end gap-2 mb-2">
                  <div className="scale-75 sm:scale-100">{getRankIcon(userPosition.rank)}</div>
                  <span className="text-xl sm:text-2xl font-bold">#{userPosition.rank}</span>
                  {/* Movement for user's best store */}
                  {(() => {
                    const change = leaderboard.find(e => e.storeId === userPosition.storeId)?.rankChange ?? 0
                    return change > 0 ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm" title="Improved vs yesterday 23:59:59 IST">
                        <FaArrowUp className="text-green-600" />{Math.abs(change)}
                      </span>
                    ) : change < 0 ? (
                      <span className="flex items-center gap-1 text-red-600 text-sm" title="Dropped vs yesterday 23:59:59 IST">
                        <FaArrowDown className="text-red-600" />{Math.abs(change)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-sm" title="No change vs yesterday 23:59:59 IST">
                        <FaMinus />
                      </span>
                    )
                  })()}
                </div>
                <div className="text-lg sm:text-xl font-bold">₹{userPosition.totalIncentive}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm opacity-80">ADLD Sales</div>
                <div className="font-bold text-sm sm:text-base">₹{userPosition.adldIncentive}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm opacity-80">Combo Sales</div>
                <div className="font-bold text-sm sm:text-base">₹{userPosition.comboIncentive}</div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-white border border-white/20"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div className="font-bold text-lg mb-2">Start Your Journey!</div>
              <div className="text-sm opacity-80 mb-4">Make your first sale to appear on the leaderboard!</div>
              <button 
                onClick={() => navigate('/plan-sell-info')}
                className="bg-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/30 transition-colors"
              >
                Start Selling
              </button>
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard Table */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <FaFire className="text-orange-400 text-sm sm:text-base" />
              <span className="truncate">All Stores Ranking</span>
            </h2>
            <p className="text-xs sm:text-sm opacity-80">Complete leaderboard by total incentives earned</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[350px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1">Rank
                      <span title="Rank movement is calculated against yesterday 23:59:59 IST. Up = improved, Down = dropped" className="text-blue-600 cursor-help">ℹ️</span>
                    </span>
                  </th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">Store</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">ADLD</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">Combo</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.storeId}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b hover:bg-gray-50 ${
                      userPosition?.storeId === entry.storeId ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <td className="p-1 sm:p-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="scale-75 sm:scale-100">{getRankIcon(entry.rank)}</div>
                        {entry.rank <= 3 && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <FaStar className="text-yellow-500 text-xs sm:text-sm" />
                          </motion.div>
                        )}
                        {/* Rank change vs yesterday 23:59:59 IST */}
                        {(() => {
                          const change = entry.rankChange ?? 0
                          return change > 0 ? (
                            <span className="flex items-center gap-0.5 text-green-600 text-xs sm:text-sm" title="Improved vs yesterday 23:59:59 IST">
                              <FaArrowUp className="text-green-600" />{Math.abs(change)}
                            </span>
                          ) : change < 0 ? (
                            <span className="flex items-center gap-0.5 text-red-600 text-xs sm:text-sm" title="Dropped vs yesterday 23:59:59 IST">
                              <FaArrowDown className="text-red-600" />{Math.abs(change)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-gray-500 text-xs sm:text-sm" title="No change vs yesterday 23:59:59 IST">
                              <FaMinus />
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="p-1 sm:p-3 min-w-[120px] sm:min-w-[180px]">
                      <div>
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm break-words leading-tight flex items-center gap-2" style={{wordBreak: 'break-word'}}>
                          {entry.storeName}
                          {entry.isNewToday === true && (
                            <>
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap inline-block" title="First submission today">New</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 break-words" style={{wordBreak: 'break-word'}}>{entry.city}</div>
                      </div>
                    </td>
                    <td className="p-1 sm:p-3 text-right font-mono text-xs sm:text-sm">₹{entry.adldIncentive}</td>
                    <td className="p-1 sm:p-3 text-right font-mono text-xs sm:text-sm">₹{entry.comboIncentive}</td>
                    <td className="p-1 sm:p-3 text-right">
                      <div className="font-bold text-sm sm:text-lg text-green-600">₹{entry.totalIncentive}</div>
                      <div className="text-xs text-gray-500">{entry.totalSales} sales</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Motivational Message */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 sm:mt-6 text-center text-white px-4"
        >
          <div className="text-3xl sm:text-4xl mb-2">🚀</div>
          <div className="text-base sm:text-lg font-semibold mb-2">Keep Pushing Higher!</div>
          <div className="text-xs sm:text-sm opacity-80">Every sale brings you closer to the top!</div>
        </motion.div>
      </div>
    </div>
  )
}