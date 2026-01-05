/**
 * Interactive PDF Question Input Script
 * 
 * This script helps you input questions directly from the Samsung ProtectMax PDF
 * Run this script and paste questions category by category
 */

const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const categories = [
  'Category 1',
  'Category 2', 
  'Category 3',
  'Category 4',
  'Category 5',
  'Category 6',
  'Category 7',
  'Category 8',
  'Category 9',
  'Category 10'
]

let allQuestions = {}
let currentCategoryIndex = 0

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

function parseQuestionText(text) {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line)
  
  if (lines.length < 6) {
    console.log('❌ Invalid format. Need at least: Question + 4 options + Answer')
    return null
  }
  
  const question = lines[0]
  const options = []
  let correctAnswer = ''
  
  // Find options (A), B), C), D))
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^[A-D]\)/)) {
      options.push(line)
    } else if (line.toLowerCase().includes('answer:') || line.toLowerCase().includes('correct:')) {
      correctAnswer = line.split(':')[1]?.trim() || ''
    }
  }
  
  if (options.length < 2 || !correctAnswer) {
    console.log('❌ Could not parse options or answer')
    return null
  }
  
  return {
    question: question.replace(/^\d+\.?\s*/, ''), // Remove question number
    options: options,
    correctAnswer: correctAnswer.toUpperCase()
  }
}

async function inputQuestionsForCategory(categoryName) {
  console.log(`\n📚 Entering questions for: ${categoryName}`)
  console.log('=' .repeat(50))
  console.log('Instructions:')
  console.log('1. Copy a question from the PDF')
  console.log('2. Paste it here (including options and answer)')
  console.log('3. Press Enter twice to finish the question')
  console.log('4. Type "done" when finished with this category')
  console.log('5. Type "skip" to skip this category')
  console.log('')
  console.log('Example format:')
  console.log('What is Samsung ProtectMax?')
  console.log('A) Screen protector')
  console.log('B) Phone case') 
  console.log('C) Insurance plan')
  console.log('D) Warranty extension')
  console.log('Answer: C')
  console.log('')
  
  const categoryQuestions = []
  let questionNumber = 1
  
  while (true) {
    console.log(`\n📝 Question ${questionNumber} for ${categoryName}:`)
    console.log('(Paste question text, then press Enter twice, or type "done"/"skip")')
    
    let questionText = ''
    let emptyLines = 0
    
    while (true) {
      const line = await askQuestion('')
      
      if (line.toLowerCase() === 'done') {
        console.log(`✅ Finished ${categoryName} with ${categoryQuestions.length} questions`)
        return categoryQuestions
      }
      
      if (line.toLowerCase() === 'skip') {
        console.log(`⏭️  Skipped ${categoryName}`)
        return []
      }
      
      if (line.trim() === '') {
        emptyLines++
        if (emptyLines >= 2) {
          break
        }
      } else {
        emptyLines = 0
        questionText += line + '\n'
      }
    }
    
    if (questionText.trim()) {
      const parsed = parseQuestionText(questionText)
      if (parsed) {
        categoryQuestions.push(parsed)
        console.log(`✅ Added question ${questionNumber}: ${parsed.question.substring(0, 50)}...`)
        questionNumber++
      } else {
        console.log('❌ Failed to parse question. Please try again.')
      }
    }
  }
}

async function generateTypeScriptFile() {
  console.log('\n🔄 Generating TypeScript file...')
  
  let tsContent = `import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Samsung ProtectMax 10 Categories Question Data
// Extracted from Samsung_ProtectMax_10_Categories_Full_QA.pdf
const samsungQuestions = {
`

  for (const [categoryName, questions] of Object.entries(allQuestions)) {
    if (questions.length > 0) {
      tsContent += `  "${categoryName}": [\n`
      
      questions.forEach((q, index) => {
        tsContent += `    {\n`
        tsContent += `      question: "${q.question.replace(/"/g, '\\"')}",\n`
        tsContent += `      options: [${q.options.map(opt => `"${opt.replace(/"/g, '\\"')}"`).join(', ')}],\n`
        tsContent += `      correctAnswer: "${q.correctAnswer}"\n`
        tsContent += `    }${index < questions.length - 1 ? ',' : ''}\n`
      })
      
      tsContent += `  ],\n\n`
    }
  }

  tsContent += `}

/**
 * Load Samsung ProtectMax questions into the database
 */
async function loadSamsungQuestions() {
  console.log('🚀 Starting Samsung ProtectMax Questions Import...')
  console.log('📚 Loading questions from 10 categories\\n')

  try {
    // Clear existing questions
    console.log('🗑️  Clearing existing questions...')
    await prisma.questionBank.deleteMany({})
    console.log('✅ Existing questions cleared\\n')

    let totalQuestionsLoaded = 0
    let questionId = 1

    // Process each category
    for (const [category, questions] of Object.entries(samsungQuestions)) {
      console.log(\`📖 Processing category: \${category}\`)
      
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
          
          console.log(\`   ✅ Question \${questionId}: \${questionData.question.substring(0, 50)}...\`)
          questionId++
          totalQuestionsLoaded++
          
        } catch (error) {
          console.log(\`   ❌ Error loading question \${questionId}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
        }
      }
      
      console.log(\`   📊 Loaded \${questions.length} questions from \${category}\\n\`)
    }

    // Summary
    console.log('='.repeat(60))
    console.log('📈 SAMSUNG QUESTIONS IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(\`📚 Total categories: \${Object.keys(samsungQuestions).length}\`)
    console.log(\`📝 Total questions loaded: \${totalQuestionsLoaded}\`)
    console.log(\`🎯 Questions per category: \${Math.floor(totalQuestionsLoaded / Object.keys(samsungQuestions).length)}\`)
    console.log('✅ Import completed successfully!')

  } catch (error) {
    console.log('💥 Error during import:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

// Export and run
export { loadSamsungQuestions }

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  loadSamsungQuestions().catch((error) => {
    console.log('💥 Unexpected error:')
    console.error('❌', error)
    process.exit(1)
  })
}
`

  // Write to file
  fs.writeFileSync('scripts/load-samsung-questions-new.ts', tsContent)
  console.log('✅ Generated: scripts/load-samsung-questions-new.ts')
}

async function main() {
  console.log('🚀 SAMSUNG PROTECTMAX PDF QUESTION INPUT')
  console.log('=' .repeat(60))
  console.log('This script will help you input questions from the PDF')
  console.log('You can input questions category by category')
  console.log('')
  
  const startChoice = await askQuestion('Do you want to start inputting questions? (y/n): ')
  if (startChoice.toLowerCase() !== 'y') {
    console.log('👋 Goodbye!')
    rl.close()
    return
  }
  
  // Input questions for each category
  for (const category of categories) {
    const questions = await inputQuestionsForCategory(category)
    allQuestions[category] = questions
  }
  
  // Summary
  console.log('\\n' + '=' .repeat(60))
  console.log('📊 INPUT SUMMARY')
  console.log('=' .repeat(60))
  
  let totalQuestions = 0
  for (const [category, questions] of Object.entries(allQuestions)) {
    console.log(\`📚 \${category}: \${questions.length} questions\`)
    totalQuestions += questions.length
  }
  
  console.log(\`\\n🎯 Total questions: \${totalQuestions}\`)
  
  if (totalQuestions > 0) {
    const generateFile = await askQuestion('\\nGenerate TypeScript file? (y/n): ')
    if (generateFile.toLowerCase() === 'y') {
      await generateTypeScriptFile()
      console.log('\\n🎉 Done! Now run: npx tsx scripts/load-samsung-questions-new.ts')
    }
  }
  
  rl.close()
}

main().catch(error => {
  console.error('💥 Error:', error)
  rl.close()
})