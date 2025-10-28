import { useMemo } from 'react'

interface ConfettiProps {
  count?: number
  colors?: string[]
  zIndex?: number
}

export function Confetti({ count = 120, colors = ['#16a34a', '#22c55e', '#10b981', '#34d399', '#86efac', '#a7f3d0'], zIndex = 50 }: ConfettiProps) {
  const pieces = useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 6,
      duration: Math.random() * 2 + 3,
      delay: Math.random() * 0.5,
      rotate: Math.random() * 360,
      xDrift: (Math.random() * 2 - 1) * 50,
      color: colors[i % colors.length],
      shape: Math.random() > 0.5 ? 'square' : 'circle'
    }))
  ), [count, colors])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex }} aria-hidden>
      {pieces.map(p => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.shape === 'square' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '9999px' : '2px',
            border: p.shape === 'circle' ? `2px solid ${p.color}` : 'none',
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards, confetti-sway ${p.duration}s ease-in-out ${p.delay}s`,
            opacity: 0.9
          }}
        />
      ))}

      {/* Extras: a few emoji poppers */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '20%',
          transform: 'translateX(-50%)',
          fontSize: 28,
          animation: 'pop 1s ease-out',
        }}
      >
        🎉
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 1; }
        }
        @keyframes confetti-sway {
          0% { margin-left: 0px; }
          50% { margin-left: 30px; }
          100% { margin-left: 0px; }
        }
        @keyframes pop {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
          60% { transform: translateX(-50%) scale(1.1); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}