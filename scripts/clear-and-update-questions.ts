import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Clear existing questions from database
 */
async function clearExistingQuestions() {
  console.log('🗑️  Clearing existing questions from database...')
  
  try {
    const deletedCount = await prisma.questionBank.deleteMany({})
    console.log(`✅ Deleted ${deletedCount.count} existing questions`)
    return deletedCount.count
  } catch (error) {
    console.log('❌ Error clearing questions:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Load new Samsung ProtectMax questions
 * REPLACE THIS DATA WITH ACTUAL QUESTIONS FROM THE PDF
 */
const newSamsungQuestions = {
  // PASTE ACTUAL QUESTIONS FROM Samsung_ProtectMax_10_Categories_Full_QA.pdf HERE
  
  "Category 1": [
    // Example format - replace with real questions:
    // {
    //   question: "Your question text here?",
    //   options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    //   correctAnswer: "A"
    // },
  ],
  
  "Category 2": [
    // Add questions from Category 2
  ],
  
  "Category 3": [
    // Add questions from Category 3
  ],
  
  "Category 4": [
    // Add questions from Category 4
  ],
  
  "Category 5": [
    // Add questions from Category 5
  ],
  
  "Category 6": [
    // Add questions from Category 6
  ],
  
  "Category 7": [
    // Add questions from Category 7
  ],
  
  "Category 8": [
    // Add questions from Category 8
  ],
  
  "Category 9": [
    // Add questions from Category 9
  ],
  
  "Category 10": [
    // Add questions from Category 10
  ]
}

/**
 * Load new questions into database
 */
async function loadNewQuestions() {
  console.log('📚 Loading new Samsung ProtectMax questions...')
  
  let totalQuestionsLoaded = 0
  let questionId = 1
  
  try {
    // Process each category
    for (const [category, questions] of Object.entries(newSamsungQuestions)) {
      if (questions.length === 0) {
        console.log(`⚠️  Skipping empty category: ${category}`)
        continue
      }
      
      console.log(`📖 Processing category: ${category}`)
      
      for (const questionData of questions) {
        try {
          await prisma.questionBank.create({
            data: {
              questionId: questionId,
              question: questionData.question,
              options: questionData.options,
              correctAnswer: questionData.correctAnswer,
              category: category
            }
          })
          
          console.log(`   ✅ Question ${questionId}: ${questionData.question.substring(0, 50)}...`)
          questionId++
          totalQuestionsLoaded++
          
        } catch (error) {
          console.log(`   ❌ Error loading question ${questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      console.log(`   📊 Loaded ${questions.length} questions from ${category}\n`)
    }
    
    return totalQuestionsLoaded
    
  } catch (error) {
    console.log('💥 Error loading questions:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 SAMSUNG PROTECTMAX QUESTION UPDATE')
  console.log('='.repeat(50))
  
  try {
    // Clear existing questions
    const deletedCount = await clearExistingQuestions()
    
    // Check if new questions are available
    const totalNewQuestions = Object.values(newSamsungQuestions).reduce((sum, questions) => sum + questions.length, 0)
    
    if (totalNewQuestions === 0) {
      console.log('\n⚠️  No new questions found!')
      console.log('📝 Please update the newSamsungQuestions object in this file with actual questions from the PDF')
      console.log('💡 Use this format for each question:')
      console.log(`{
  question: "Your question text?",
  options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  correctAnswer: "A"
}`)
      return
    }
    
    // Load new questions
    const loadedCount = await loadNewQuestions()
    
    // Summary
    console.log('='.repeat(60))
    console.log('📈 UPDATE SUMMARY')
    console.log('='.repeat(60))
    console.log(`🗑️  Questions deleted: ${deletedCount}`)
    console.log(`📚 Questions loaded: ${loadedCount}`)
    console.log(`📊 Categories updated: ${Object.keys(newSamsungQuestions).filter(cat => newSamsungQuestions[cat].length > 0).length}`)
    console.log('✅ Update completed successfully!')
    
  } catch (error) {
    console.log('💥 Update failed:', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

// Run the script
main().catch((error) => {
  console.log('💥 Unexpected error:')
  console.error('❌', error)
  process.exit(1)
})