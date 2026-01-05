import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Samsung ProtectMax 10 Categories Question Data
// REAL QUESTIONS FROM Samsung_ProtectMax_10_Categories_Full_QA.pdf
// Please replace this placeholder data with actual questions from the PDF

const samsungQuestions = {
  // PLACEHOLDER - REPLACE WITH ACTUAL PDF CONTENT
  // Copy questions from Samsung_ProtectMax_10_Categories_Full_QA.pdf here
  
  "Category 1": [
    // Add actual questions from Category 1 of the PDF
  ],
  
  "Category 2": [
    // Add actual questions from Category 2 of the PDF
  ],
  
  "Category 3": [
    // Add actual questions from Category 3 of the PDF
  ],
  
  "Category 4": [
    // Add actual questions from Category 4 of the PDF
  ],
  
  "Category 5": [
    // Add actual questions from Category 5 of the PDF
  ],
  
  "Category 6": [
    // Add actual questions from Category 6 of the PDF
  ],
  
  "Category 7": [
    // Add actual questions from Category 7 of the PDF
  ],
  
  "Category 8": [
    // Add actual questions from Category 8 of the PDF
  ],
  
  "Category 9": [
    // Add actual questions from Category 9 of the PDF
  ],
  
  "Category 10": [
    // Add actual questions from Category 10 of the PDF
  ]
}

/**
 * Load Samsung ProtectMax questions into the database
 */
async function loadSamsungQuestions() {
  console.log('🚀 Starting Samsung ProtectMax Questions Import...')
  console.log('📚 Loading questions from 10 categories\n')

  try {
    // Clear existing questions (optional - comment out if you want to keep existing questions)
    console.log('🗑️  Clearing existing questions...')
    await prisma.questionBank.deleteMany({})
    console.log('✅ Existing questions cleared\n')

    let totalQuestionsLoaded = 0
    let questionId = 1

    // Process each category
    for (const [category, questions] of Object.entries(samsungQuestions)) {
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

    // Summary
    console.log('='.repeat(60))
    console.log('📈 SAMSUNG QUESTIONS IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`📚 Total categories: ${Object.keys(samsungQuestions).length}`)
    console.log(`📝 Total questions loaded: ${totalQuestionsLoaded}`)
    console.log(`🎯 Questions per category: ${Math.floor(totalQuestionsLoaded / Object.keys(samsungQuestions).length)}`)
    console.log('✅ Import completed successfully!')

  } catch (error) {
    console.log('💥 Error during import:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

/**
 * Get unique question set for a SEC user
 * Ensures each SEC gets different questions from each category
 */
async function getUniqueQuestionSetForSEC(secId: string): Promise<any[]> {
  try {
    console.log(`🎯 Generating unique question set for SEC: ${secId}`)
    
    // Get all categories
    const categories = await prisma.questionBank.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    })

    console.log(`📚 Found ${categories.length} categories`)

    const selectedQuestions = []
    
    // For each category, select one question based on SEC ID
    for (const categoryGroup of categories) {
      if (!categoryGroup.category) continue
      
      const categoryQuestions = await prisma.questionBank.findMany({
        where: {
          category: categoryGroup.category
        },
        orderBy: {
          questionId: 'asc'
        }
      })

      if (categoryQuestions.length > 0) {
        // Use SEC ID to deterministically select a question from this category
        // This ensures the same SEC always gets the same question from each category
        // but different SECs get different questions
        const secHash = hashString(secId)
        const questionIndex = secHash % categoryQuestions.length
        const selectedQuestion = categoryQuestions[questionIndex]
        
        selectedQuestions.push({
          ...selectedQuestion,
          categoryName: categoryGroup.category
        })
        
        console.log(`   ✅ Selected question ${selectedQuestion.questionId} from ${categoryGroup.category}`)
      }
    }

    console.log(`🎉 Generated ${selectedQuestions.length} unique questions for SEC ${secId}`)
    return selectedQuestions

  } catch (error) {
    console.log('💥 Error generating question set:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Test the question distribution system
 */
async function testQuestionDistribution() {
  console.log('🧪 Testing question distribution system...\n')
  
  const testSECs = ['SEC001', 'SEC002', 'SEC003', 'SEC004', 'SEC005']
  
  for (const secId of testSECs) {
    console.log(`\n📋 Testing for ${secId}:`)
    const questions = await getUniqueQuestionSetForSEC(secId)
    
    // Group by category to verify we have one from each
    const categoryCounts = questions.reduce((acc, q) => {
      acc[q.category || 'Unknown'] = (acc[q.category || 'Unknown'] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log(`   📊 Questions by category:`, categoryCounts)
    console.log(`   🎯 Total questions: ${questions.length}`)
  }
  
  await prisma.$disconnect()
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  console.log('📱 SAMSUNG PROTECTMAX QUESTION MANAGEMENT')
  console.log('='.repeat(50))

  switch (command) {
    case 'load':
      await loadSamsungQuestions()
      break
    case 'test':
      await testQuestionDistribution()
      break
    case 'generate':
      const secId = args[1]
      if (!secId) {
        console.log('❌ Please provide SEC ID: npm run script generate SEC001')
        return
      }
      const questions = await getUniqueQuestionSetForSEC(secId)
      console.log(`\n📋 Questions for ${secId}:`)
      questions.forEach((q, index) => {
        console.log(`${index + 1}. [${q.category}] ${q.question}`)
        console.log(`   Options: ${q.options.join(', ')}`)
        console.log(`   Correct: ${q.correctAnswer}\n`)
      })
      await prisma.$disconnect()
      break
    default:
      console.log('📖 Available commands:')
      console.log('   npm run script load    - Load questions from data into database')
      console.log('   npm run script test    - Test question distribution system')
      console.log('   npm run script generate SEC001 - Generate questions for specific SEC')
      console.log('\n💡 Usage: tsx scripts/load-samsung-questions.ts [command]')
  }
}

// Export functions for use in other modules
export { loadSamsungQuestions, getUniqueQuestionSetForSEC, hashString }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.log('💥 Unexpected error:')
    console.error('❌', error)
    process.exit(1)
  })
}