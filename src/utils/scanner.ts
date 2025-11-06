// Lightweight camera/scan helpers with sensible fallbacks
// No external dependencies; uses BarcodeDetector when available

export type ScanHandler = (value: string) => void

// IMEI helpers
export function luhnCheck(num: string): boolean {
  let sum = 0
  let shouldDouble = false
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = Number(num[i])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

export function parseImeiFromText(s: string): string | null {
  const digits = s.replace(/\D+/g, ' ')
  const parts = digits.trim().split(/\s+/)
  for (const p of parts) {
    if (p.length === 15 && /^\d{15}$/.test(p) && luhnCheck(p)) return p
  }
  // Some IMEI barcodes include two 15-digit numbers (IMEI + SV). Prefer the first valid one.
  const m = s.match(/\d{15,17}/g)
  if (m) {
    for (const candidate of m) {
      const c15 = candidate.slice(0, 15)
      if (/^\d{15}$/.test(c15) && luhnCheck(c15)) return c15
    }
  }
  return null
}

// Haptics
export function vibrate(pattern: number | number[] = 40) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { (navigator as any).vibrate(pattern) } catch {}
  }
}

// Camera support
export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export async function getRearCameraStream(): Promise<MediaStream> {
  if (!isCameraSupported()) throw new Error('Camera not supported')
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
  } catch (e) {
    // Fallback: try without constraints
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  }
}

export function stopStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach(t => t.stop())
}

// BarcodeDetector wrapper
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).BarcodeDetector === 'function'
}

type BarcodeFormat =
  | 'aztec' | 'code_128' | 'code_39' | 'code_93' | 'codabar' | 'data_matrix'
  | 'ean_13' | 'ean_8' | 'itf' | 'pdf417' | 'qr_code' | 'upc_a' | 'upc_e'

declare global {
  interface Window { BarcodeDetector?: any }
}

export function createBarcodeDetector(formats?: BarcodeFormat[]) {
  if (!isBarcodeDetectorSupported()) return null
  const Detector = (window as any).BarcodeDetector
  try {
    return new Detector({ formats: formats ?? ['ean_13', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] })
  } catch {
    return new Detector()
  }
}

// De-duplicate scans
export function createScanDeduper(onScan: ScanHandler, dedupeMs = 1200) {
  let last = ''
  let lastAt = 0
  return (value: string) => {
    const now = Date.now()
    if (value && (value !== last || now - lastAt > dedupeMs)) {
      last = value
      lastAt = now
      onScan(value)
    }
  }
}