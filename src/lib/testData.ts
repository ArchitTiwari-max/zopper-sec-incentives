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
}

export interface TestSubmission {
  id?: string
  secId: string
  phone?: string
  sessionToken: string
  responses: TestResponse[]
  score: number
  totalQuestions: number
  submittedAt: string
  completionTime: number // in seconds
  isProctoringFlagged?: boolean
  storeId?: string
  storeName?: string
  storeCity?: string
}

// Samsung Care+ Question Bank - All 40+ questions
const allSamsungQuestions: Question[] = [
  // Section A: Situation-Based (Customer Scenarios)
  { id: 1, question: "A customer drops their new Samsung phone in water two weeks after buying it but didn't buy the plan. They now want to buy it. What do you say and why?", options: ["A) Yes, they can still buy it with extra charges.", "B) Yes, but it will cover only water damage.", "C) No, the plan must be bought within 7 days", "D) Yes, if they show proof of damage."], correctAnswer: "C", category: "Section A" },
  { id: 2, question: "A Fold phone customer comes on Day 8 after purchase to buy the plan. How do you respond?", options: ["A) Eligible with late purchase fees.", "B) Accept only if diagnostics are done immediately.", "C) Not eligible — Fold/Flip models must buy within 7 days.", "D) Accept the purchase — Fold phones have 30 days to buy."], correctAnswer: "C", category: "Section A" },
  { id: 3, question: "A customer's name is on the invoice, but their father uses the phone. Will the plan still cover the father?", options: ["A) Yes, coverage extends to spouse, children, and parents.", "B) Yes, but only if father's name is added later.", "C) No, unless a transfer fee is paid.", "D) No, coverage is only for the buyer."], correctAnswer: "A", category: "Section A" },
  { id: 4, question: "A company buys 50 phones and 50 plans for staff. Who will be treated as the 'Customer' for claim purposes?", options: ["A) The plan provider, Zopper.", "B) Only the store where it was purchased.", "C) The company or its authorised representative/employee.", "D) Any employee who uses the phone."], correctAnswer: "C", category: "Section A" },
  { id: 5, question: "A buyer lost the phone invoice but has the plan confirmation email. What will you advise before they raise a claim?", options: ["A) Submit only a screenshot of the My Galaxy app.", "B) They must provide both the device and plan invoice or get a copy.", "C) No issue — the email alone is enough.", "D) Ask them to file a police report first."], correctAnswer: "C", category: "Section A" },
  { id: 6, question: "A customer's phone was damaged on the same day as buying it and the plan. Can they raise a claim immediately?", options: ["A) Yes, damage after plan activation is covered.", "B) No, because the plan starts 7 days later.", "C) Yes, but only for manufacturing defects.", "D) No, because claims before diagnostics are invalid."], correctAnswer: "A", category: "Section A" },
  { id: 7, question: "If a customer upgrades their phone after six months, can the plan be transferred?", options: ["A) Only if the new device is Samsung.", "B) Yes, the plan moves to the new device automatically.", "C) No, the plan stays linked to the registered device.", "D) Yes, only once per customer."], correctAnswer: "C", category: "Section A" },

  // Section B: Application-Based (Decision & Policy Use)
  { id: 11, question: "You're trying to convince a hesitant customer. What's the strongest difference between this plan and a normal warranty?", options: ["A) Warranty covers accidental damage; plan covers only manufacturing faults.", "B) Warranty covers manufacturing faults; plan covers accidental and liquid damage.", "C) Warranty and plan both cover the same issues.", "D) Plan covers theft; warranty covers water damage."], correctAnswer: "B", category: "Section B" },
  { id: 12, question: "If a customer made three damage claims in one year, can they still make a fourth? What's the condition?", options: ["A) Yes, unlimited claims allowed within invoice value limit.", "B) No, only three claims allowed.", "C) Yes, but only after paying an extra fee.", "D) No, unless the plan is renewed."], correctAnswer: "A", category: "Section B" },
  { id: 13, question: "How would you explain the 'processing fee' to a customer to avoid confusion later?", options: ["A) Small fee charged per repair; varies by phone category.", "B) Fee only applies for the first claim.", "C) Fee is optional if the customer requests.", "D) Fee covers warranty extensions."], correctAnswer: "A", category: "Section B" },
  { id: 14, question: "A customer says, 'I'll buy the plan next week.' What persuasive yet honest point can you make?", options: ["A) Encourage immediate purchase — must be bought within 7 days", "B) Accept later purchase with penalty.", "C) Advise buying next month for better coverage.", "D) Suggest buying another phone instead."], correctAnswer: "A", category: "Section B" },
  { id: 16, question: "A customer wants to know if screen cracks are covered. How would you clarify using plan terminology?", options: ["A) Only scratches are covered.", "B) No physical damage is covered.", "C) Yes — accidental physical damage like screen cracks is included.", "D) Only water damage is covered."], correctAnswer: "C", category: "Section B" },
  { id: 17, question: "If a device fails due to manufacturing fault, should the plan or the warranty be used first?", options: ["A) Warranty should be used first; plan covers accidental/liquid damage.", "B) Plan should be used first; warranty is optional.", "C) Either can be used interchangeably.", "D) Warranty only if phone is older than 6 months."], correctAnswer: "A", category: "Section B" },
  { id: 18, question: "A customer says, 'I dropped my phone; only the camera glass broke.' Does the plan cover this?", options: ["A) No, camera glass is excluded.", "B) Yes, it counts as accidental physical damage.", "C) Only if entire camera module is broken.", "D) No, only screen damage is covered."], correctAnswer: "B", category: "Section B" },
  { id: 19, question: "A buyer got the phone through a gift from a friend. Can they still buy the plan in their own name?", options: ["A) Yes, if friend transfers invoice.", "B) No — plan only valid for original purchaser from official channel.", "C) Yes, after 3-day waiting period.", "D) Only if it's a Fold/Flip phone."], correctAnswer: "B", category: "Section B" },
  { id: 20, question: "How would you handle a customer accusing the store of hiding plan limitations?", options: ["A) Apologize and refund immediately.", "B) Stay calm, show brochure or official terms, clarify politely.", "C) Escalate to higher management only.", "D) Deny any limitations exist."], correctAnswer: "B", category: "Section B" },

  // Section C: Knowledge-Based (Plan Details)
  { id: 22, question: "How long does the plan last from activation?", options: ["A) 6 months", "B) 2 years", "C) 1 year", "D) Until first claim"], correctAnswer: "C", category: "Section C" },
  { id: 23, question: "Within how many days must a customer buy the plan after phone purchase?", options: ["A) 7 days", "B) 3 days (or 30 days with diagnostics)", "C) 15 days", "D) 60 days"], correctAnswer: "B", category: "Section C" },
  { id: 26, question: "Can the plan be purchased for non-Samsung phones?", options: ["A) Yes, with additional fee", "B) No, only Samsung phones", "C) Only for phones under warranty", "D) Yes, if registered on My Galaxy App"], correctAnswer: "B", category: "Section C" },
  { id: 27, question: "How many total repair claims can a customer make in one year?", options: ["A) 1", "B) 3", "C) Unlimited within invoice value limit", "D) 5"], correctAnswer: "C", category: "Section C" },
  { id: 28, question: "What is the maximum claim value?", options: ["A) Half of invoice value", "B) Unlimited claims with each claim upto invoice value of the phone", "C) No limit", "D) Only for screen repairs"], correctAnswer: "B", category: "Section C" },
  { id: 29, question: "Is a processing fee charged for every claim?", options: ["A) No", "B) Yes", "C) Only for the first claim", "D) Only for liquid damage claims"], correctAnswer: "B", category: "Section C" },
  { id: 30, question: "Who else can use the phone under the same plan apart from the buyer?", options: ["A) Only spouse", "B) Spouse, children, or parents", "C) Any friend of the buyer", "D) Only business employees"], correctAnswer: "B", category: "Section C" },

  // Section D: Real-World Scenarios (Applied Skills)
  { id: 31, question: "A customer claims their phone fell in a pool and stopped working. What 3 questions should you ask before directing them to service?", options: ["A) Was the plan active? When did damage happen?", "B) What colour is the phone? When purchased? Who gifted it?", "C) Did they buy insurance? Did they drop it before purchase? What is the IMEI?", "D) Is it Fold/Flip? Warranty status? Store location?"], correctAnswer: "A", category: "Section D" },
  { id: 32, question: "Unsure if a customer's plan is active. How do you confirm?", options: ["A) Only Check confirmation email /Whatsapp / SMS received by Customer", "B) Only Check with Samsung Care+ Call Center team", "C) Only ask Zopper POC to confirm", "D) Confirmation of the plan activation can be obtained by using all of the mechanisms mentioned in A, B and C"], correctAnswer: "D", category: "Section D" },
  { id: 34, question: "Parent buying a phone for child but worries about coverage. What do you say?", options: ["A) Coverage applies only to the buyer", "B) Children are covered under family provision", "C) Only spouse can use phone", "D) Child needs separate plan"], correctAnswer: "B", category: "Section D" },
  { id: 35, question: "Explain 'Registered Device' to a confused customer.", options: ["A) Device enrolled under plan within valid time frame", "B) Any phone the customer owns", "C) Only Fold/Flip phones", "D) Phone purchased from Zopper only"], correctAnswer: "A", category: "Section D" },
  { id: 37, question: "How do you explain 'Plan Term' to someone who thinks it means EMI period?", options: ["A) 1-year coverage, not payment period", "B) Number of claims allowed", "C) Time to repair phone", "D) Warranty period"], correctAnswer: "A", category: "Section D" },
  { id: 39, question: "Customer thinks 'unlimited claims' means 'free repairs every time.' What do you say?", options: ["A) Unlimited claims allowed, but each has processing fee, total up to invoice value", "B) Yes, truly unlimited free repairs", "C) Only 3 free repairs allowed", "D) Fee applies only for liquid damage"], correctAnswer: "A", category: "Section D" },
  { id: 40, question: "Another employee gives wrong plan info. How do you correct them?", options: ["A) Ignore it", "B) Correct politely using official policy documents", "C) Report immediately to manager", "D) Tell customer instead"], correctAnswer: "B", category: "Section D" },

  // Section E: Advanced Scenario Application
  { id: 41, question: "A customer's plan activation is pending; phone gets water damage. What happens?", options: ["A) Claim valid after plan activation", "B) Claim automatically rejected", "C) Claim accepted if purchased within 7 days", "D) Claim partially valid"], correctAnswer: "A", category: "Section E" },
  { id: 42, question: "Fold phone purchased 2 days ago, plan purchased on same day. Claim for screen crack today — is it valid?", options: ["A) Yes, accidental damage is covered", "B) No, first claim only after 30 days", "C) No, only liquid damage covered", "D) Yes, but only after diagnostics"], correctAnswer: "A", category: "Section E" },
  { id: 44, question: "Customer's spouse uses the registered device and damages it. Claim?", options: ["A) Denied — only buyer covered", "B) Covered — family members included", "C) Covered only if spouse's name added later", "D) Partially covered"], correctAnswer: "B", category: "Section E" },
  { id: 45, question: "Customer asks if refurbished phones can have the plan.", options: ["A) Yes, with special approval", "B) No — plan not valid for refurbished or returned phones", "C) Yes, but only Fold/Flip", "D) Only if purchased online"], correctAnswer: "B", category: "Section E" },
  { id: 47, question: "How is invoice value related to claims?", options: ["A) Maximum total repair claims equal invoice value", "B) Unlimited money reimbursed", "C) Only half invoice value covered", "D) Only processing fee covered"], correctAnswer: "A", category: "Section E" },
  { id: 48, question: "Plan purchased on same day as phone — when does coverage start?", options: ["A) Day of purchase/activation", "B) Next day", "C) After diagnostics only", "D) After one week"], correctAnswer: "A", category: "Section E" },
  { id: 50, question: "Employee asks if unlimited claims mean multiple free repairs. How to answer?", options: ["A) Unlimited claims, but total cost cannot exceed invoice value and processing fee applies each time", "B) Truly unlimited free repairs", "C) Only 3 repairs allowed", "D) Only one repair per 6 months"], correctAnswer: "A", category: "Section E" }
]

/**
 * Generate random 10 questions ensuring at least one from each section
 * Uses phone number as seed for consistent questions per user
 */
function generateQuestionsForPhone(phone: string): Question[] {
  // Use phone as seed for deterministic randomization
  const seed = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  // Simple seeded random function
  let randomSeed = seed
  const seededRandom = () => {
    randomSeed = (randomSeed * 1664525 + 1013904223) % 4294967296
    return randomSeed / 4294967296
  }
  
  // Group questions by section
  const sections: { [key: string]: Question[] } = {
    'Section A': allSamsungQuestions.filter(q => q.category === 'Section A'),
    'Section B': allSamsungQuestions.filter(q => q.category === 'Section B'),
    'Section C': allSamsungQuestions.filter(q => q.category === 'Section C'),
    'Section D': allSamsungQuestions.filter(q => q.category === 'Section D'),
    'Section E': allSamsungQuestions.filter(q => q.category === 'Section E')
  }
  
  const selectedQuestions: Question[] = []
  
  // Step 1: Select one question from each section
  Object.values(sections).forEach(sectionQuestions => {
    if (sectionQuestions.length > 0) {
      const randomIndex = Math.floor(seededRandom() * sectionQuestions.length)
      selectedQuestions.push(sectionQuestions[randomIndex])
    }
  })
  
  // Step 2: Select 5 more random questions from remaining pool
  const remainingQuestions = allSamsungQuestions.filter(
    q => !selectedQuestions.find(sq => sq.id === q.id)
  )
  
  // Shuffle remaining questions
  const shuffled = [...remainingQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  selectedQuestions.push(...shuffled.slice(0, 5))
  
  // Step 3: Shuffle final selection
  for (let i = selectedQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]]
  }
  
  return selectedQuestions
}

// Cache for generated questions per phone
const questionCache = new Map<string, Question[]>()

/**
 * Get questions for a specific phone number
 * Questions are generated once per phone and cached
 */
export function getQuestionsForPhone(phone: string): Question[] {
  if (!questionCache.has(phone)) {
    const questions = generateQuestionsForPhone(phone)
    questionCache.set(phone, questions)
  }
  return questionCache.get(phone)!
}

// Export for backward compatibility
export const sampleQuestions: Question[] = allSamsungQuestions.slice(0, 10)

/**
 * Get all test submissions from API
 * @param secId Optional SEC ID to filter results for a specific user
 */
import { config } from '@/lib/config'

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
