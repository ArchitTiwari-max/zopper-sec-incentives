import { config } from '@/lib/config'

export type ProctoringEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'no_face'
  | 'multi_face'
  | 'loud_noise'
  | 'mic_active'
  | 'video_off'

export async function logProctoringEvent(params: {
  secId: string
  sessionToken?: string
  eventType: ProctoringEventType
  details?: string
}) {
  try {
    await fetch(`${config.apiUrl}/proctoring/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
  } catch (e) {
    // Best-effort only
    console.warn('proctoring log failed', e)
  }
}
