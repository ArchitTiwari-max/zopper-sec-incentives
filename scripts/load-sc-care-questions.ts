import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const prisma = new PrismaClient()

async function loadSCCareQuestions() {
    console.log('🚀 Loading SC Care+ Questions from PDF...')

    const pdfPath = path.resolve('sc care+ - Google Docs.pdf')
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ sc care+ - Google Docs.pdf not found!')
        console.log('📍 Please ensure the PDF is in the root directory of the project.')
        return
    }

    // 1. Extract Text from PDF
    console.log('📖 Extracting text from PDF...')
    const buffer = fs.readFileSync(pdfPath)
    const data = new Uint8Array(buffer)
    const loadingTask = pdfjsLib.getDocument({ data })
    const doc = await loadingTask.promise

    let fullText = ''
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const strings = content.items.map((item: any) => item.str)
        fullText += strings.join(' ') + '\n'
    }

    console.log('📄 Full text extracted, length:', fullText.length)

    // 2. Parse Questions
    console.log('🧩 Parsing questions...')

    // Normalize whitespace
    fullText = fullText.replace(/\s+/g, ' ')

    // Extract categories and questions
    const questionsToInsert: any[] = []
    let globalQuestionId = 1

    // Find all category headers
    const categories: { name: string; content: string }[] = []
    const categoryMatches: { index: number }[] = []

    const catRegex = /Category\s+\d+\s*:/gi
    let match
    while ((match = catRegex.exec(fullText)) !== null) {
        categoryMatches.push({ index: match.index })
    }

    console.log(`📊 Found ${categoryMatches.length} categories\n`)

    // Extract category names and content
    for (let i = 0; i < categoryMatches.length; i++) {
        const catMatch = categoryMatches[i]
        const nextCatIndex = i < categoryMatches.length - 1 ? categoryMatches[i + 1].index : fullText.length

        const categoryBlock = fullText.substring(catMatch.index, nextCatIndex)

        // Extract category name (everything between "Category X:" and first "Q")
        const nameMatch = categoryBlock.match(/Category\s+\d+\s*:\s*([^Q]+)/)
        const categoryName = nameMatch ? nameMatch[1].trim() : `Category ${i + 1}`

        categories.push({
            name: categoryName,
            content: categoryBlock
        })
    }

    // Parse questions from each category
    for (const category of categories) {
        console.log(`📂 Processing: ${category.name}`)

        // Find all questions in this category by looking for "Q" followed by digit
        const questionStarts: number[] = []
        const qRegex = /Q\d+\./g
        let qm
        while ((qm = qRegex.exec(category.content)) !== null) {
            questionStarts.push(qm.index)
        }

        console.log(`   Found ${questionStarts.length} question markers`)

        // Process each question
        let successCount = 0
        for (let i = 0; i < questionStarts.length; i++) {
            const startIdx = questionStarts[i]
            const endIdx = i < questionStarts.length - 1 ? questionStarts[i + 1] : category.content.length
            const questionBlock = category.content.substring(startIdx, endIdx)

            // Extract question text (from Q1. to ?)
            const questionTextMatch = questionBlock.match(/Q\d+\.\s*(.+?\?)/)
            if (!questionTextMatch) {
                continue
            }
            const questionText = questionTextMatch[1].trim()

            // Try multiple patterns for extracting options
            let optionA, optionB, optionC, optionD

            // Pattern 1: A. text B. text C. text D. text
            optionA = questionBlock.match(/A\.\s*(.+?)\s*B\./)
            optionB = questionBlock.match(/B\.\s*(.+?)\s*C\./)
            optionC = questionBlock.match(/C\.\s*(.+?)\s*D\./)
            optionD = questionBlock.match(/D\.\s*(.+?)(?:✅|✓|Correct)/)

            // Pattern 2: a. text b. text c. text d. text (lowercase)
            if (!optionA || !optionB || !optionC || !optionD) {
                optionA = questionBlock.match(/a\.\s*(.+?)\s*b\./)
                optionB = questionBlock.match(/b\.\s*(.+?)\s*c\./)
                optionC = questionBlock.match(/c\.\s*(.+?)\s*d\./)
                optionD = questionBlock.match(/d\.\s*(.+?)(?:✅|✓|Correct)/)
            }

            // Pattern 3: a) text b) text c) text d) text
            if (!optionA || !optionB || !optionC || !optionD) {
                optionA = questionBlock.match(/a\)\s*(.+?)\s*b\)/)
                optionB = questionBlock.match(/b\)\s*(.+?)\s*c\)/)
                optionC = questionBlock.match(/c\)\s*(.+?)\s*d\)/)
                optionD = questionBlock.match(/d\)\s*(.+?)(?:✅|✓|Correct)/)
            }

            // Pattern 4: A) text B) text C) text D) text (uppercase with parenthesis)
            if (!optionA || !optionB || !optionC || !optionD) {
                optionA = questionBlock.match(/A\)\s*(.+?)\s*B\)/)
                optionB = questionBlock.match(/B\)\s*(.+?)\s*C\)/)
                optionC = questionBlock.match(/C\)\s*(.+?)\s*D\)/)
                optionD = questionBlock.match(/D\)\s*(.+?)(?:✅|✓|Correct)/)
            }

            if (!optionA || !optionB || !optionC || !optionD) {
                continue
            }

            // Extract correct answer - try multiple patterns
            let answerMatch = questionBlock.match(/Correct\s*Answer\s*:\s*([A-Da-d])/)
            if (!answerMatch) {
                answerMatch = questionBlock.match(/✅\s*Correct\s*Answer\s*:\s*([A-Da-d])/)
            }
            if (!answerMatch) {
                answerMatch = questionBlock.match(/Answer\s*:\s*([A-Da-d])/)
            }

            if (!answerMatch) {
                continue
            }

            const options = [
                `A) ${optionA[1].trim()}`,
                `B) ${optionB[1].trim()}`,
                `C) ${optionC[1].trim()}`,
                `D) ${optionD[1].trim()}`
            ]

            questionsToInsert.push({
                questionId: globalQuestionId++,
                question: questionText,
                options: options,
                correctAnswer: answerMatch[1].toUpperCase(),
                category: category.name
            })

            successCount++
        }

        console.log(`   ✅ Successfully parsed ${successCount} questions\n`)
    }

    // 4. Validate and insert into database
    if (questionsToInsert.length === 0) {
        console.error('❌ No questions parsed! The PDF format might be different than expected.')
        console.log('\n📝 Dumping first 2000 characters for manual inspection:')
        console.log(fullText.substring(0, 2000))
        return
    }

    console.log(`\n✨ Found ${questionsToInsert.length} valid questions across ${categories.length} categories.`)

    // Show statistics by category
    const categoryStats: { [key: string]: number } = {}
    questionsToInsert.forEach(q => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1
    })

    console.log('\n📊 Questions per category:')
    console.table(categoryStats)

    // Save to JSON file first (backup)
    const jsonOutput = {
        totalQuestions: questionsToInsert.length,
        totalCategories: Object.keys(categoryStats).length,
        categoryStats,
        questions: questionsToInsert
    }

    const jsonPath = path.resolve('sc-care-questions-backup.json')
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2))
    console.log(`\n💾 Saved backup to: ${jsonPath}`)

    // Confirm before deleting old questions
    console.log('\n⚠️  This will DELETE all existing questions and replace them with new ones.')
    console.log('🗑️  Deleting old questions...')

    try {
        await prisma.questionBank.deleteMany({})
        console.log('💾 Inserting new questions into database...')

        await prisma.questionBank.createMany({
            data: questionsToInsert
        })

        console.log('\n✅ Successfully loaded SC Care+ questions!')
        console.log(`📈 Total questions: ${questionsToInsert.length}`)
        console.log(`📂 Total categories: ${Object.keys(categoryStats).length}`)

        // Verify we got all 8 categories
        if (Object.keys(categoryStats).length !== 8) {
            console.warn(`\n⚠️  WARNING: Expected 8 categories but found ${Object.keys(categoryStats).length}`)
            console.log('Please review the PDF format and category extraction logic.')
        } else {
            console.log('\n🎉 All 8 categories loaded successfully!')
        }
    } catch (error) {
        console.error('❌ Database error:', error)
        console.log('\n💡 Questions have been saved to JSON backup file.')
        console.log('   You can manually import them when the database is available.')
    }
}

loadSCCareQuestions()
    .catch(e => {
        console.error('❌ Error:', e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
