import { useEffect, useRef, useState } from 'react'
import { logProctoringEvent } from '@/lib/proctoring'
import { config } from '@/lib/config'
import { uploadImageBlobToCloudinary } from '@/lib/cloudinary'

interface ProctoringPanelProps {
  secId: string
  phone?: string
  sessionToken?: string
  onFlag?: (flagged: boolean) => void
}

// Lightweight proctoring: camera preview, mic noise detection, tab switch logging, optional face detection (lazy)
export function ProctoringPanel({ secId, phone, sessionToken, onFlag }: ProctoringPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [active, setActive] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [faceApiReady, setFaceApiReady] = useState(false)
  const [flags, setFlags] = useState<string[]>([])
  const [autoStarted, setAutoStarted] = useState(false)

  // Log and mark flagged (excluding benign events like mic_active or snapshot)
  const flag = async (eventType: string, details?: string) => {
    const isBenign = eventType === 'mic_active' || eventType === 'snapshot'
    if (!isBenign) {
      setFlags(prev => {
        const next = prev.length < 50 ? [...prev, `${new Date().toLocaleTimeString()} • ${eventType}${details ? ` • ${details}` : ''}`] : prev
        return next
      })
      onFlag?.(true)
    }
    await logProctoringEvent({ secId, phone, sessionToken, eventType: eventType as any, details })
  }

  // ===== Random snapshot uploader =====
  const snapshotTimerRef = useRef<number | null>(null)
  const cfg = {
    minMs: 20_000,
    maxMs: 45_000,
    mimeType: 'image/jpeg' as const,
    quality: 0.9,
  }

  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  function stopRandomSnapshots() {
    if (snapshotTimerRef.current) {
      window.clearTimeout(snapshotTimerRef.current)
      snapshotTimerRef.current = null
    }
  }

  function scheduleNextSnapshot() {
    stopRandomSnapshots()
    snapshotTimerRef.current = window.setTimeout(tickSnapshot, rand(cfg.minMs, cfg.maxMs))
  }

  function captureBlobFromVideo(video: HTMLVideoElement, { type, quality }: { type: string; quality: number }) {
    const canvas = document.createElement('canvas')
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, w, h)
    return new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b as Blob), type, quality))
  }

  async function tickSnapshot() {
    console.log('📸 tickSnapshot called')
    try {
      console.log('📸 About to check conditions...')
      console.log('📸 Checking conditions:', {
        hasVideoRef: !!videoRef.current,
        active,
        documentHidden: document.hidden,
        videoWidth: videoRef.current?.videoWidth
      })

      if (!videoRef.current || !videoRef.current.srcObject) {
        console.debug('📸 Skip snapshot: video not ready or no stream')
        return scheduleNextSnapshot()
      }
      if (document.hidden) {
        console.debug('📸 Skip snapshot: document hidden')
        return scheduleNextSnapshot()
      }
      // wait for readiness
      if (!videoRef.current.videoWidth) {
        console.debug('📸 Skip snapshot: video dimensions not ready')
        return scheduleNextSnapshot()
      }

      console.debug('📸 Capturing snapshot...')
      const blob = await captureBlobFromVideo(videoRef.current, { type: cfg.mimeType, quality: cfg.quality })
      console.debug('📸 Blob captured:', blob.size, 'bytes')

      const cld = config.cloudinary
      console.debug('📸 Cloudinary config:', { cloudName: cld?.cloudName, uploadPreset: cld?.uploadPreset, signed: cld?.signed, folder: cld?.folder })

      if (!cld?.cloudName || !(cld.uploadPreset || cld.signed)) {
        console.warn('📸 No Cloudinary config; skipping upload')
        return scheduleNextSnapshot()
      }

      let result: any
      if (cld.uploadPreset) {
        console.debug('📸 Using unsigned upload')
        // Unsigned upload path (quick start)
        result = await uploadImageBlobToCloudinary(blob, {
          cloudName: cld.cloudName,
          uploadPreset: cld.uploadPreset,
          folder: cld.folder,
        })
      } else if (cld.signed) {
        console.debug('📸 Using signed upload')
        // Signed upload path — get signature from server
        const sigUrl = `${config.apiUrl}/cloudinary-signature?${cld.folder ? `folder=${encodeURIComponent(cld.folder)}` : ''}`
        console.debug('📸 Fetching signature from:', sigUrl)
        const sigRes = await fetch(sigUrl)
        if (!sigRes.ok) throw new Error(`signature_fetch_failed: ${sigRes.status}`)
        const sig = await sigRes.json()
        console.debug('📸 Got signature:', { cloudName: sig.cloudName, apiKey: sig.apiKey?.slice(0, 6) + '...', timestamp: sig.timestamp })
        result = await uploadImageBlobToCloudinary(blob, {
          cloudName: sig.cloudName || cld.cloudName,
          apiKey: sig.apiKey,
          timestamp: sig.timestamp,
          signature: sig.signature,
          folder: cld.folder,
        })
      } else {
        console.warn('📸 No upload method configured')
        return scheduleNextSnapshot()
      }

      console.debug('📸 Upload result:', result)

      const cloudinaryUrl = result?.secure_url || result?.url || (result?.public_id ? `public_id=${result.public_id}` : undefined)
      console.log('📸 ========================================')
      console.log('📸 CLOUDINARY URL TO SAVE:', cloudinaryUrl)
      console.log('📸 Session Token:', sessionToken)
      console.log('📸 SEC ID:', secId)
      console.log('📸 ========================================')

      await logProctoringEvent({
        secId,
        phone,
        sessionToken,
        eventType: 'snapshot',
        details: cloudinaryUrl,
      })

      console.log('✅ Snapshot URL saved to database:', cloudinaryUrl)
    } catch (e) {
      console.error('📸 Snapshot upload error:', e)
      console.error('📸 Error stack:', e instanceof Error ? e.stack : e)
    } finally {
      console.log('📸 tickSnapshot finally block')
      scheduleNextSnapshot()
    }
  }

  function startRandomSnapshots() {
    scheduleNextSnapshot()
  }

  // Auto-start on mount
  useEffect(() => {
    if (!autoStarted && secId) {
      setAutoStarted(true)
      start()
    }
    return () => {
      stopRandomSnapshots()
    }
  }, [autoStarted, secId])

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
    console.log('📸 Starting proctoring...')
    try {
      console.log('📸 Getting user media...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      console.log('📸 Got stream, setting up video...')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        console.log('📸 Video playing, setting active to true')
      }
      setActive(true)
      console.log('📸 Active state set to true')
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

      // Start random snapshot uploads to Cloudinary
      console.log('📸 Proctoring started, config:', config.cloudinary)
      startRandomSnapshots()

      // Test snapshot after everything is set up
      setTimeout(() => {
        console.log('📸 Testing immediate snapshot after setup...')
        try {
          tickSnapshot()
        } catch (e) {
          console.error('📸 Error calling tickSnapshot:', e)
        }
      }, 2000)

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
            } catch { }
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
    setMinimized(false)
    stopRandomSnapshots()
    if (videoRef.current && videoRef.current.srcObject) {
      ; (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }

  // Floating compact icon when minimized
  const CompactIcon = () => (
    <button
      aria-label="Proctoring On"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-green-600 text-white px-3 py-2 shadow-lg text-xs"
      onClick={() => setMinimized(false)}
    >
      📷 Proctoring On
    </button>
  )

  return (
    <>
      {active && minimized && <CompactIcon />}
      <div className={`fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 w-64 z-50 ${active && minimized ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Proctoring {active && <span className="text-green-600">●</span>}</div>
          <div className="flex items-center gap-2">
            {active && (
              <button className="px-2 py-1 text-xs bg-gray-200 rounded" onClick={() => setMinimized(true)}>Minimize</button>
            )}
          </div>
        </div>
        {/* Keep video element mounted even when minimized (hidden via parent) so stream continues */}
        <video ref={videoRef} className="w-full h-32 bg-black rounded object-cover" muted playsInline></video>
        <div className="mt-2 text-[10px] text-gray-600 h-14 overflow-y-auto">
          {flags.length === 0 ? 'No alerts yet.' : flags.slice(-5).map((f, i) => <div key={i}>{f}</div>)}
        </div>
        <div className="mt-1 text-[10px] text-gray-400">Face detection: {faceApiReady ? 'on' : 'loading...'}</div>
      </div>
    </>
  )
}
