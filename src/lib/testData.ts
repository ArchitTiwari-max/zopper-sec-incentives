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
  secId: string
  sessionToken: string
  responses: TestResponse[]
  score: number
  totalQuestions: number
  submittedAt: string
  completionTime: number // in seconds
  isProctoringFlagged?: boolean
}

// Sample questions for the test
export const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the most important factor when selling a mobile plan to a customer?",
    options: [
      "A) Price only", 
      "B) Understanding customer needs", 
      "C) Commission amount", 
      "D) Network coverage only"
    ],
    correctAnswer: "B",
    category: "Sales Strategy"
  },
  {
    id: 2,
    question: "How should you handle a customer complaint about network issues?",
    options: [
      "A) Ignore the complaint", 
      "B) Blame the network provider", 
      "C) Listen actively and offer solutions", 
      "D) Transfer to another representative"
    ],
    correctAnswer: "C",
    category: "Customer Service"
  },
  {
    id: 3,
    question: "What information is required for a new SIM card activation?",
    options: [
      "A) Name only", 
      "B) ID proof and address proof", 
      "C) Phone number only", 
      "D) Payment details only"
    ],
    correctAnswer: "B",
    category: "Process Knowledge"
  },
  {
    id: 4,
    question: "When is the best time to upsell additional services?",
    options: [
      "A) Before understanding customer needs", 
      "B) After completing the primary transaction", 
      "C) During payment processing", 
      "D) Only when customer asks"
    ],
    correctAnswer: "B",
    category: "Sales Strategy"
  },
  {
    id: 5,
    question: "How do you calculate commission for a Rs. 399 plan with 5% commission?",
    options: [
      "A) Rs. 15", 
      "B) Rs. 19.95", 
      "C) Rs. 20", 
      "D) Rs. 25"
    ],
    correctAnswer: "B",
    category: "Calculations"
  },
  {
    id: 6,
    question: "What should you do if a customer's ID document is unclear?",
    options: [
      "A) Accept it anyway", 
      "B) Refuse the transaction", 
      "C) Ask for a clearer copy or alternative document", 
      "D) Photocopy it multiple times"
    ],
    correctAnswer: "C",
    category: "Process Knowledge"
  },
  {
    id: 7,
    question: "Which approach builds better customer relationships?",
    options: [
      "A) Quick transactions", 
      "B) Personal attention and follow-up", 
      "C) Lowest price offers only", 
      "D) Minimal conversation"
    ],
    correctAnswer: "B",
    category: "Customer Service"
  },
  {
    id: 8,
    question: "What is the first step when a customer enters your store?",
    options: [
      "A) Ask them to sit down", 
      "B) Greet them warmly and ask how you can help", 
      "C) Show them the price list", 
      "D) Check their phone"
    ],
    correctAnswer: "B",
    category: "Customer Service"
  },
  {
    id: 9,
    question: "How do you handle price objections from customers?",
    options: [
      "A) Reduce the price immediately", 
      "B) Explain the value and benefits", 
      "C) Refer them to competitors", 
      "D) End the conversation"
    ],
    correctAnswer: "B",
    category: "Sales Strategy"
  },
  {
    id: 10,
    question: "What documentation should you maintain for each sale?",
    options: [
      "A) Customer receipt only", 
      "B) No documentation needed", 
      "C) Complete transaction record with ID copies", 
      "D) Cash receipt only"
    ],
    correctAnswer: "C",
    category: "Process Knowledge"
  }
]

/**
 * Get all test submissions from localStorage
 */
export function getTestSubmissions(): TestSubmission[] {
  const saved = localStorage.getItem('test_submissions')
  if (!saved) return []
  
  try {
    return JSON.parse(saved) as TestSubmission[]
  } catch {
    return []
  }
}

/**
 * Save test submission to localStorage
 */
export function saveTestSubmission(submission: TestSubmission): void {
  const submissions = getTestSubmissions()
  submissions.push(submission)
  localStorage.setItem('test_submissions', JSON.stringify(submissions))
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
export function getTestStatistics() {
  const submissions = getTestSubmissions()
  
  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      passRate: 0,
      averageTime: 0
    }
  }
  
  const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0)
  const avgScore = Math.round(totalScore / submissions.length)
  
  const passed = submissions.filter(sub => sub.score >= 60).length
  const passRate = Math.round((passed / submissions.length) * 100)
  
  const totalTime = submissions.reduce((sum, sub) => sum + sub.completionTime, 0)
  const avgTime = Math.round(totalTime / submissions.length)
  
  return {
    totalSubmissions: submissions.length,
    averageScore: avgScore,
    passRate,
    averageTime: avgTime
  }
}