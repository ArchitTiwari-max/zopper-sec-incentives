import { config } from '@/lib/config'

export type ProctoringEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'no_face'
  | 'multi_face'
  | 'loud_noise'
  | 'mic_active'
  | 'video_off'
  | 'snapshot'

export async function logProctoringEvent(params: {
  secId: string
  phone?: string
  sessionToken?: string
  eventType: ProctoringEventType
  details?: string
}) {
  try {
    const response = await fetch(`${config.apiUrl}/proctoring/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      console.error('❌ Proctoring event API failed:', response.status, response.statusText)
      return
    }

    const result = await response.json()

    if (params.eventType === 'snapshot') {
      console.log('✅ Screenshot saved to database successfully')
      console.log('   Database ID:', result?.data?.id)
      console.log('   URL verified:', result?.data?.details)
    }

    return result
  } catch (e) {
    // Best-effort only
    console.error('❌ Proctoring log failed:', e)
  }
}
