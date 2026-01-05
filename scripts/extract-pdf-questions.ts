import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')

const prisma = new PrismaClient()

interface ParsedQuestion {
  question: string
  options: string[]
  correctAnswer: string
  category: string
}

/**
 * Extract questions from Samsung ProtectMax PDF
 */
async function extractQuestionsFromPDF() {
  console.log('🚀 Starting PDF Question Extraction')
  console.log('='.repeat(50))
  
  try {
    // Read the PDF file
    const pdfPath = path.join(process.cwd(), 'Samsung_ProtectMax_10_Categories_Full_QA.pdf')
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`)
    }
    
    console.log(`📖 Reading PDF: ${pdfPath}`)
    const dataBuffer = fs.readFileSync(pdfPath)
    
    // Parse PDF content
    console.log('🔍 Parsing PDF content...')
    const data = await pdf(dataBuffer)
    const text = data.text
    
    console.log(`📄 Extracted ${text.length} characters from PDF`)
    console.log('🔍 Analyzing content structure...\n')
    
    // Parse questions from text
    const questions = parseQuestionsFromText(text)
    
    console.log(`📚 Found ${questions.length} total questions`)
    
    // Group by categories
    const questionsByCategory = groupQuestionsByCategory(questions)
    
    // Display summary
    console.log('\n📊 Questions by Category:')
    for (const [category, categoryQuestions] of Object.entries(questionsByCategory)) {
      console.log(`   ${category}: ${categoryQuestions.length} questions`)
    }
    
    return questionsByCategory
    
  } catch (error) {
    console.log('❌ Error extracting questions from PDF:')
    console.error(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Parse questions from PDF text content
 */
function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  
  // Split text into lines and clean
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  console.log(`📝 Processing ${lines.length} lines of text...`)
  
  let currentCategory = 'Unknown Category'
  let questionBuffer: string[] = []
  let questionNumber = 1
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect category headers (various patterns)
    if (isCategoryHeader(line)) {
      currentCategory = extractCategoryName(line)
      console.log(`📂 Found category: ${currentCategory}`)
      continue
    }
    
    // Detect question start (various patterns)
    if (isQuestionStart(line)) {
      // Process previous question if exists
      if (questionBuffer.length > 0) {
        const parsed = parseQuestionBuffer(questionBuffer, currentCategory)
        if (parsed) {
          questions.push(parsed)
          console.log(`   ✅ Parsed question ${questionNumber}: ${parsed.question.substring(0, 40)}...`)
          questionNumber++
        }
        questionBuffer = []
      }
      
      // Start new question
      questionBuffer.push(line)
    } else if (questionBuffer.length > 0) {
      // Continue collecting question content
      questionBuffer.push(line)
      
      // Check if we've reached the end of this question
      if (isQuestionEnd(line, lines, i)) {
        const parsed = parseQuestionBuffer(questionBuffer, currentCategory)
        if (parsed) {
          questions.push(parsed)
          console.log(`   ✅ Parsed question ${questionNumber}: ${parsed.question.substring(0, 40)}...`)
          questionNumber++
        }
        questionBuffer = []
      }
    }
  }
  
  // Process final question if exists
  if (questionBuffer.length > 0) {
    const parsed = parseQuestionBuffer(questionBuffer, currentCategory)
    if (parsed) {
      questions.push(parsed)
      console.log(`   ✅ Parsed question ${questionNumber}: ${parsed.question.substring(0, 40)}...`)
    }
  }
  
  return questions
}

/**
 * Check if line is a category header
 */
function isCategoryHeader(line: string): boolean {
  const categoryPatterns = [
    /^category\s*\d+/i,
    /^section\s*[a-z]/i,
    /^part\s*\d+/i,
    /^\d+\.\s*[A-Z][a-z\s]+$/,
    /^[A-Z][A-Z\s&]+$/
  ]
  
  return categoryPatterns.some(pattern => pattern.test(line.trim()))
}

/**
 * Extract category name from header line
 */
function extractCategoryName(line: string): string {
  // Clean up the category name
  let category = line.trim()
  
  // Remove common prefixes
  category = category.replace(/^(category|section|part)\s*\d*:?\s*/i, '')
  category = category.replace(/^\d+\.\s*/, '')
  
  // If it's all caps, convert to title case
  if (category === category.toUpperCase()) {
    category = category.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  return category || 'Unknown Category'
}

/**
 * Check if line starts a question
 */
function isQuestionStart(line: string): boolean {
  const questionPatterns = [
    /^\d+\.\s*/, // 1. Question text
    /^Q\d*:?\s*/i, // Q: or Q1: Question text
    /^Question\s*\d*:?\s*/i, // Question: or Question 1:
    /^[A-Z].*\?$/, // Line ending with question mark
  ]
  
  return questionPatterns.some(pattern => pattern.test(line.trim()))
}

/**
 * Check if we've reached the end of a question
 */
function isQuestionEnd(line: string, allLines: string[], currentIndex: number): boolean {
  // Look for answer pattern
  if (/^(answer|correct|ans)\s*:?\s*[A-D]/i.test(line)) {
    return true
  }
  
  // Look ahead to see if next line starts a new question
  if (currentIndex + 1 < allLines.length) {
    const nextLine = allLines[currentIndex + 1]
    if (isQuestionStart(nextLine) || isCategoryHeader(nextLine)) {
      return true
    }
  }
  
  return false
}

/**
 * Parse a question from collected lines
 */
function parseQuestionBuffer(buffer: string[], category: string): ParsedQuestion | null {
  if (buffer.length < 3) return null // Need at least question + 2 options
  
  let questionText = ''
  const options: string[] = []
  let correctAnswer = ''
  
  for (const line of buffer) {
    const cleanLine = line.trim()
    
    // Check if it's an option (A), B), C), D))
    if (/^[A-D]\)/.test(cleanLine)) {
      options.push(cleanLine)
    }
    // Check if it's an answer
    else if (/^(answer|correct|ans)\s*:?\s*([A-D])/i.test(cleanLine)) {
      const match = cleanLine.match(/([A-D])/i)
      if (match) {
        correctAnswer = match[1].toUpperCase()
      }
    }
    // Otherwise, it's part of the question
    else if (!questionText && cleanLine.length > 10) {
      questionText = cleanLine.replace(/^\d+\.\s*/, '').replace(/^Q\d*:?\s*/i, '').replace(/^Question\s*\d*:?\s*/i, '')
    }
  }
  
  // Validate parsed question
  if (!questionText || options.length < 2 || !correctAnswer) {
    return null
  }
  
  return {
    question: questionText,
    options: options,
    correctAnswer: correctAnswer,
    category: category
  }
}

/**
 * Group questions by category
 */
function groupQuestionsByCategory(questions: ParsedQuestion[]): Record<string, ParsedQuestion[]> {
  const grouped: Record<string, ParsedQuestion[]> = {}
  
  for (const question of questions) {
    if (!grouped[question.category]) {
      grouped[question.category] = []
    }
    grouped[question.category].push(question)
  }
  
  return grouped
}

/**
 * Load questions into database
 */
async function loadQuestionsToDatabase(questionsByCategory: Record<string, ParsedQuestion[]>) {
  console.log('\n🗑️  Clearing existing questions...')
  
  try {
    // Clear existing questions
    const deletedCount = await prisma.questionBank.deleteMany({})
    console.log(`✅ Deleted ${deletedCount.count} existing questions`)
    
    console.log('\n📚 Loading new questions into database...')
    
    let totalLoaded = 0
    let questionId = 1
    
    // Load questions category by category
    for (const [category, questions] of Object.entries(questionsByCategory)) {
      console.log(`\n📖 Loading ${category} (${questions.length} questions)`)
      
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
          totalLoaded++
          
        } catch (error) {
          console.log(`   ❌ Error loading question ${questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }
    
    return totalLoaded
    
  } catch (error) {
    console.log('❌ Error loading questions to database:')
    console.error(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📱 SAMSUNG PROTECTMAX PDF QUESTION EXTRACTOR')
  console.log('='.repeat(60))
  console.log('📅 Started at:', new Date().toISOString())
  
  try {
    // Extract questions from PDF
    const questionsByCategory = await extractQuestionsFromPDF()
    
    // Load to database
    const totalLoaded = await loadQuestionsToDatabase(questionsByCategory)
    
    // Final summary
    console.log('\n' + '='.repeat(60))
    console.log('📈 EXTRACTION & LOADING SUMMARY')
    console.log('='.repeat(60))
    console.log(`📚 Categories found: ${Object.keys(questionsByCategory).length}`)
    console.log(`📝 Questions loaded: ${totalLoaded}`)
    console.log(`🎯 Average per category: ${Math.round(totalLoaded / Object.keys(questionsByCategory).length)}`)
    console.log('✅ Process completed successfully!')
    
    // Test the unique question system
    console.log('\n🧪 Testing unique question distribution...')
    const testSECs = ['SEC001', 'SEC002', 'SEC003']
    
    for (const secId of testSECs) {
      const uniqueQuestions = await getUniqueQuestionsForSEC(secId)
      console.log(`   ${secId}: ${uniqueQuestions.length} unique questions`)
    }
    
  } catch (error) {
    console.log('\n💥 Process failed:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Database connection closed')
  }
}

/**
 * Get unique questions for a SEC (same logic as API)
 */
async function getUniqueQuestionsForSEC(secId: string) {
  const categories = await prisma.questionBank.groupBy({
    by: ['category'],
    _count: { category: true }
  })

  const selectedQuestions = []
  
  for (const categoryGroup of categories) {
    if (!categoryGroup.category) continue
    
    const categoryQuestions = await prisma.questionBank.findMany({
      where: { category: categoryGroup.category },
      orderBy: { questionId: 'asc' }
    })

    if (categoryQuestions.length > 0) {
      const secHash = hashString(secId)
      const questionIndex = secHash % categoryQuestions.length
      selectedQuestions.push(categoryQuestions[questionIndex])
    }
  }
  
  return selectedQuestions
}

/**
 * Hash function for consistent question selection
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.log('💥 Unexpected error:')
    console.error('❌', error)
    process.exit(1)
  })
}

export { extractQuestionsFromPDF, loadQuestionsToDatabase }