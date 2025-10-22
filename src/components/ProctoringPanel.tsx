import { useEffect, useRef, useState } from 'react'
import { logProctoringEvent } from '@/lib/proctoring'

interface ProctoringPanelProps {
  secId: string
  sessionToken?: string
  onFlag?: (flagged: boolean) => void
}

// Lightweight proctoring: camera preview, mic noise detection, tab switch logging, optional face detection (lazy)
export function ProctoringPanel({ secId, sessionToken, onFlag }: ProctoringPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [active, setActive] = useState(false)
  const [faceApiReady, setFaceApiReady] = useState(false)
  const [flags, setFlags] = useState<string[]>([])

  // Log and mark flagged
  const flag = async (eventType: string, details?: string) => {
    setFlags(prev => {
      const next = prev.length < 50 ? [...prev, `${new Date().toLocaleTimeString()} • ${eventType}${details ? ` • ${details}` : ''}`] : prev
      return next
    })
    onFlag?.(true)
    await logProctoringEvent({ secId, sessionToken, eventType: eventType as any, details })
  }

  // Tab/visibility events
  useEffect(() => {
    if (!active) return
    const onVis = () => {
      if (document.hidden) flag('tab_switch')
    }
    const onBlur = () => flag('window_blur')
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
    }
  }, [active])

  // Start camera/mic
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
      flag('mic_active')
      // Mic noise detection
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let noisyFor = 0
      const loop = () => {
        if (!active) return
        analyser.getByteTimeDomainData(data)
        // Simple RMS
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        if (rms > 0.2) noisyFor += 200; else noisyFor = Math.max(0, noisyFor - 100)
        if (noisyFor > 2000) { // 2s sustained noise
          flag('loud_noise', `rms=${rms.toFixed(2)}`)
          noisyFor = 0
        }
        requestAnimationFrame(loop)
      }
      loop()

      // Lazy-load face-api from CDN and run basic detection if available
      try {
        // @ts-ignore
        if (!(window as any).faceapi) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js'
            s.onload = () => resolve()
            s.onerror = () => reject()
            document.head.appendChild(s)
          })
        }
        // @ts-ignore
        const faceapi = (window as any).faceapi
        if (faceapi) {
          setFaceApiReady(true)
          const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          ])
          let lastNoFace = 0
          const faceLoop = async () => {
            if (!active || !videoRef.current) return
            try {
              const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              const faces = detections?.length || 0
              const now = Date.now()
              if (faces === 0) {
                if (now - lastNoFace > 4000) { // no face >4s
                  flag('no_face')
                  lastNoFace = now
                }
              } else if (faces > 1) {
                flag('multi_face', `faces=${faces}`)
              }
            } catch {}
            setTimeout(faceLoop, 1200)
          }
          faceLoop()
        }
      } catch {
        // Face detect optional
      }
    } catch (e) {
      await flag('video_off', 'permission_denied')
    }
  }

  const stop = () => {
    setActive(false)
    if (videoRef.current && videoRef.current.srcObject) {
      ;(videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 w-64 z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Proctoring</div>
        {!active ? (
          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded" onClick={start}>Start</button>
        ) : (
          <button className="px-2 py-1 text-xs bg-gray-200 rounded" onClick={stop}>Stop</button>
        )}
      </div>
      <video ref={videoRef} className="w-full h-32 bg-black rounded object-cover" muted playsInline></video>
      <div className="mt-2 text-[10px] text-gray-600 h-14 overflow-y-auto">
        {flags.length === 0 ? 'No alerts yet.' : flags.slice(-5).map((f, i) => <div key={i}>{f}</div>)}
      </div>
      <div className="mt-1 text-[10px] text-gray-400">Face detection: {faceApiReady ? 'on' : 'loading...'}</div>
    </div>
  )
}
