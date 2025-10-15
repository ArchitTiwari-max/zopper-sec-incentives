import { useEffect, useRef, useState } from 'react'
import { createBarcodeDetector, getRearCameraStream, isBarcodeDetectorSupported, parseImeiFromText, stopStream, vibrate, createScanDeduper } from '@/utils/scanner'

interface Props {
  onDetected: (value: string, parsed?: string | null) => void
  onClose: () => void
}

export default function CameraScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [supported, setSupported] = useState(isBarcodeDetectorSupported())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await getRearCameraStream()
        if (cancelled) { stopStream(s); return }
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play().catch(() => {})
        }
        const detector = createBarcodeDetector()
        if (!detector) {
          setSupported(false)
          setError('Barcode detector not supported on this device')
          return
        }
        const handleScan = createScanDeduper((val) => {
          const parsed = parseImeiFromText(val)
          vibrate()
          onDetected(val, parsed)
        })
        const loop = async () => {
          if (!videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes && barcodes.length) {
              const first = barcodes[0]
              const value = first.rawValue ?? first?.rawValue ?? ''
              if (value) handleScan(value)
            }
          } catch (e) {
            // Ignore transient detection errors
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        setError(e?.message || 'Failed to access camera')
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stopStream(stream)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <video ref={videoRef} className="w-full rounded-2xl shadow-lg" playsInline muted autoPlay />
        <button onClick={onClose} className="absolute -top-3 -right-3 bg-white text-black rounded-full px-3 py-1 shadow">Close</button>
        {error && (
          <div className="mt-2 text-center text-sm text-red-200">{error}</div>
        )}
        {!supported && !error && (
          <div className="mt-2 text-center text-sm text-white">Scanning not supported on this device/browser.</div>
        )}
      </div>
    </div>
  )
}