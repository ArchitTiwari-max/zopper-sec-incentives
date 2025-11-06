import { useState, useEffect } from 'react'

interface TestTimerProps {
  duration: number // in seconds
  onTimeUp: () => void
  isActive: boolean
}

export function TestTimer({ duration, onTimeUp, isActive }: TestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, timeLeft, onTimeUp])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = (): string => {
    const percentLeft = (timeLeft / duration) * 100
    if (percentLeft <= 10) return 'text-red-600'
    if (percentLeft <= 25) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (): string => {
    const percentLeft = (timeLeft / duration) * 100
    if (percentLeft <= 10) return 'bg-red-500'
    if (percentLeft <= 25) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (!isActive) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 min-w-[140px]">
      <div className="text-center">
        <div className={`text-2xl font-mono font-bold ${getTimerColor()}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="text-xs text-gray-500 mt-1">Time Remaining</div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
          <div 
            className={`h-1 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
        
        {/* Warning when time is running low */}
        {timeLeft <= 60 && timeLeft > 0 && (
          <div className="text-xs text-red-500 mt-2 animate-pulse">
            ⚠️ Less than 1 minute left!
          </div>
        )}
      </div>
    </div>
  )
}