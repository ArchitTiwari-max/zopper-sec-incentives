export interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: string
  category?: string
}

export interface TestResponse {
  questionId: number
  selectedAnswer: string
  answeredAt: string
  // Enriched fields from backend
  questionText?: string
  options?: string[]
  correctAnswer?: string
  isCorrect?: boolean
}

export interface TestSubmission {
  id?: string
  secId: string
  phone?: string
  name?: string  // User's actual name
  sessionToken: string
  responses: TestResponse[]
  score: number
  totalQuestions: number
  submittedAt: string
  completionTime: number // in seconds
  isProctoringFlagged?: boolean
  screenshotUrls?: string[]
  storeId?: string
  storeName?: string
  storeCity?: string
}

// Import config for API calls
import { config } from '@/lib/config'

// Samsung Care+ Question Bank - Fetched from API
// No hardcoded questions - all questions come from database

/**
 * Fetch questions from API for a specific SEC
 */
export async function getQuestionsForSEC(secId: string): Promise<Question[]> {
  try {
    const response = await fetch(`${config.apiUrl}/questions/unique/${secId}`)
    const result = await response.json()

    if (result.success && result.data) {
      return result.data.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category
      }))
    }

    console.warn('⚠️ No questions found for SEC:', secId)
    return []
  } catch (error) {
    console.error('❌ Error fetching questions for SEC:', secId, error)
    return []
  }
}

/**
 * Get questions for a specific phone number (backward compatibility)
 * Now uses SEC ID to get unique questions from API
 */
export function getQuestionsForPhone(phone: string): Promise<Question[]> {
  // Use phone as SEC ID for backward compatibility
  return getQuestionsForSEC(phone)
}

// Export empty array for backward compatibility - questions now come from API
export const sampleQuestions: Question[] = []

/**
 * Get all test submissions from API
 * @param secId Optional SEC ID to filter results for a specific user
 */


export async function getTestSubmissions(secId?: string): Promise<TestSubmission[]> {
  try {
    const queryParams = secId ? `?secId=${encodeURIComponent(secId)}` : ''
    const apiUrl = `${config.apiUrl}/test-submissions${queryParams}`
    console.log('🔍 Fetching test submissions from', apiUrl)

    // Timeout after 10s to avoid indefinite loading if API is down
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeout)

    console.log('📡 Response status:', response.status, response.statusText)
    const result = await response.json()
    console.log('📦 API result:', result)
    if (result.success && result.data) {
      console.log(`✅ Found ${result.data.length} test submissions`)
      return result.data.map((item: any) => ({
        id: item.id,
        secId: item.secId,
        phone: item.phone || (item.secId && /^\d{10}$/.test(item.secId) ? item.secId : undefined),
        sessionToken: item.sessionToken,
        responses: item.responses,
        score: item.score,
        totalQuestions: item.totalQuestions,
        submittedAt: item.submittedAt,
        completionTime: item.completionTime,
        isProctoringFlagged: item.isProctoringFlagged,
        screenshotUrls: item.screenshotUrls || [],
        storeId: item.storeId,
        storeName: item.storeName,
        storeCity: item.storeCity
      }))
    }
    console.warn('⚠️ No data found in API response')
    return []
  } catch (error) {
    if ((error as any)?.name === 'AbortError') {
      console.error('❌ Fetch test submissions timed out')
    } else {
      console.error('❌ Error fetching test submissions:', error)
    }
    return []
  }
}

/**
 * Get a single test submission by ID
 */
export async function getTestSubmissionById(id: string): Promise<TestSubmission | null> {
  try {
    const response = await fetch(`${config.apiUrl}/test-submissions/${id}`)
    const result = await response.json()

    if (result.success && result.data) {
      const item = result.data
      return {
        id: item.id,
        secId: item.secId,
        phone: item.phone || (item.secId && /^\d{10}$/.test(item.secId) ? item.secId : undefined),
        sessionToken: item.sessionToken,
        responses: item.responses, // This will include enriched data if backend provides it
        score: item.score,
        totalQuestions: item.totalQuestions,
        submittedAt: item.submittedAt,
        completionTime: item.completionTime,
        isProctoringFlagged: item.isProctoringFlagged,
        screenshotUrls: item.screenshotUrls || [],
        storeId: item.storeId,
        storeName: item.storeName,
        storeCity: item.storeCity
      }
    }
    return null
  } catch (error) {
    console.error('Error fetching test submission by ID:', error)
    return null
  }
}

/**
 * Save test submission to API
 */
export async function saveTestSubmission(submission: TestSubmission): Promise<void> {
  try {
    const response = await fetch(`${config.apiUrl}/test-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submission)
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to save submission')
    }
  } catch (error) {
    console.error('Error saving test submission:', error)
    throw error
  }
}

/**
 * Calculate test score
 */
export function calculateScore(responses: TestResponse[], questions: Question[]): number {
  let correct = 0

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId)
    if (question && response.selectedAnswer === question.correctAnswer) {
      correct++
    }
  })

  return Math.round((correct / questions.length) * 100)
}

/**
 * Get test statistics for admin dashboard
 */
export async function getTestStatistics() {
  try {
    const response = await fetch(`${config.apiUrl}/test-submissions/statistics`)
    const result = await response.json()
    if (result.success && result.data) {
      return result.data
    }
    return {
      totalSubmissions: 0,
      averageScore: 0,
      passRate: 0,
      averageTime: 0
    }
  } catch (error) {
    console.error('Error fetching test statistics:', error)
    return {
      totalSubmissions: 0,
      averageScore: 0,
      passRate: 0,
      averageTime: 0
    }
  }
}
