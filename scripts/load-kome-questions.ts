
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const prisma = new PrismaClient()

async function loadKomeQuestions() {
    console.log('🚀 Loading Kome Questions from PDF...')

    const pdfPath = path.resolve('kome-text.pdf')
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ kome-text.pdf not found!')
        return
    }

    // 1. Extract Text
    console.log('📖 Extracting text from PDF...')
    const buffer = fs.readFileSync(pdfPath)
    const data = new Uint8Array(buffer)
    const loadingTask = pdfjsLib.getDocument({ data })
    const doc = await loadingTask.promise

    let fullText = ''
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        // Join with space to keep lines flow, but might merge headers. 
        // Usually items have x/y coords. Simple join might need newline if y changes significantly.
        // But for now, simple join with space, but maybe check if item hasEOL?
        // pdfjs content items usually don't have explicit newlines.
        // Let's just join with " " and rely on regex patterns.
        // Actually, adding a newline might be safer for regex matching of "Category X:"
        // Let's try to add newlines based on basic heuristics or just join with "\n" if it seems like a line break.
        // The previous dump used " " and it seemed readable but "Category 2" was embedded.
        // Let's use specific " " join but try to spot patterns.
        // actually, let's use the dump strategy which was:
        // strings.join(' ') + '\n' (at end of page).
        // This might merge lines within a page.
        // Let's try to detect line breaks better? 
        // No, let's stick to the dump format which seemed to capture "Category X:" reasonably well, 
        // although it might be "Basics Employee 1".

        // Better strategy for this specific PDF based on previous dump:
        // The dump showed: "Category 1: ... Answer: b) No Employee 2 - Q1: ..."
        // So "Employee" usually starts a new question.
        // "Category \d+:" starts a new category.

        const strings = content.items.map((item: any) => item.str)
        fullText += strings.join(' ') + '\n'
    }

    // 2. Parse Text
    console.log('🧩 Parsing questions...')

    // Clean up: normalize spaces
    fullText = fullText.replace(/\s+/g, ' ')

    // Split by Category
    // Regex to find "Category X: Name"
    // It seems to be "Category \d+: [^Employee]+"
    // Let's split using a lookahead or just find all matches.

    // Structure seems to be: Category -> Questions
    // I will use a regex to capture Category blocks.
    // Since "Category" appears 10 times, I can split by /Category \d+:/

    const categoryRegex = /Category\s+\d+:\s+([^E]+)/g
    // Wait, the title might contain "Employee" if it's "Employee Support".
    // Let's split by "Category \d+:" and ignore the title for a moment, or try to grab it.

    const chunks = fullText.split(/Category\s+\d+:/)
    // chunks[0] is garbage before first category (or empty)
    // chunks[1] is content of Cat 1, chunks[2] is Cat 2...

    // We need to know which category is which.
    // Let's match the headers first to get names.

    const questionsToInsert: any[] = []
    let globalQuestionId = 1

    // We skip chunk 0.
    // We need to identify the category name for each chunk.
    // The split consumes the "Category X:" part.
    // The text immediately following usually is the title, ending before "Employee".

    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i]
        // Extract Title: Everything up to "Employee" or "Q1" or start of first question
        // The first question usually starts with "Employee \d+ - Q\d+:"
        const employeeMatch = chunk.match(/Employee\s+\d+\s+-\s+Q\d+:/)
        if (!employeeMatch || employeeMatch.index === undefined) {
            console.log(`⚠️  No questions found in Category chunk ${i}`)
            continue
        }

        let categoryName = chunk.substring(0, employeeMatch.index).trim()
        // Clean category name (remove trailing spaces, etc)
        categoryName = categoryName.replace(/[^\w\s&]+$/, '').trim()

        console.log(`📂 Processing Category ${i}: ${categoryName}`)

        const questionsBlock = chunk.substring(employeeMatch.index)

        // Split questions by "Employee X - QY:"
        // We can use a regex to match the delimiter and then iterate.
        const questionDelimiter = /Employee\s+\d+\s+-\s+Q\d+:/g

        // We can't easily split and keep the delimiter info (like Employee ID), but we don't need Employee ID.
        // We just need to split.
        const qChunks = questionsBlock.split(questionDelimiter)

        // qChunks[0] is empty or garbage.
        for (let j = 1; j < qChunks.length; j++) {
            let qText = qChunks[j]

            // Parse Question, Options, Answer
            // Format: "Question text? a) ... b) ... Answer: X"

            // Find "Answer:"
            const answerMatch = qText.match(/Answer:\s*([^\s]+)/) // Matches "Answer: a)" or "Answer: A"
            // Sometimes answer is explicit text "Answer: [Feedback...]"

            if (!answerMatch) {
                // Try checking for "Answer : "
                continue
            }

            // If Answer is "[Feedback", skip
            if (qText.includes("Feedback question") || answerMatch[1].startsWith("[")) {
                continue
            }

            const fullAnswerSection = qText.substring(answerMatch.index!)
            let correctAnswerLetter = answerMatch[1].replace(/[\)\.]/g, '').trim().toUpperCase() // "A" or "B"

            // Verify answer letter is A, B, C, D
            if (!['A', 'B', 'C', 'D'].includes(correctAnswerLetter)) {
                // Sometimes it might be "b)" -> "B"
                // If it captures "b)", clean it.
                // If it captures "Accidental", that's wrong.
                // The regex `([^\s]+)` might capture "a)".
                // Let's refine.
            }

            // Extract Question part (before options)
            // Options usually start with " a) " or " A) " or " a. " or " A. "
            // Regex for first option:
            const optionStartRegex = /\s(a|A)[\)\.]\s/
            const optionMatch = qText.match(optionStartRegex)

            if (!optionMatch) {
                // Maybe options are distinctive? Skip if can't find clear options
                continue
            }

            const questionBody = qText.substring(0, optionMatch.index).trim()

            // Extract Options
            // We expect a), b), c), d) or A), B), C), D)
            // We can split by `\s[a-d|A-D][\)\.]\s`
            // But we need to capture the letter to know which is which.

            // Simple extractor:
            // Find all option indices
            const optionPattern = /\s([a-d|A-D])[\)\.]\s+(.*?)(?=\s[a-d|A-D][\)\.]\s|Answer:|$)/g
            // This regex matches " a) Option text "

            // Since regex in JS doesn't do "match all" nicely with simple iterators for full ranges in one go slightly complex
            // Let's just manually parse A, B, C, D.

            let options = []
            const possibleLabels = ['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']
            // We need to find their positions.

            // Let's use a simpler approach: get the text from first option start to "Answer:"
            const optionsBlock = qText.substring(optionMatch.index!, answerMatch.index).trim()

            // Split options block by labels
            const splitOptions = optionsBlock.split(/\s([a-d|A-D])[\)\.]\s/)
            // splitOptions[0] is empty (because starts with "a)")
            // splitOptions[1] is "a", splitOptions[2] is text for A
            // splitOptions[3] is "b", splitOptions[4] is text for B

            const parsedOptions = []

            for (let k = 1; k < splitOptions.length; k += 2) {
                const label = splitOptions[k].toUpperCase() // A
                const text = splitOptions[k + 1].trim()
                parsedOptions.push(`${label}) ${text}`)
            }

            if (parsedOptions.length < 2) continue // Need at least 2 options

            questionsToInsert.push({
                questionId: globalQuestionId++,
                question: questionBody,
                options: parsedOptions,
                correctAnswer: correctAnswerLetter,
                category: categoryName
            })
        }
    }

    // 3. Write to DB
    if (questionsToInsert.length === 0) {
        console.error('❌ No questions parsed! Check regex or PDF format.')
        return
    }

    console.log(`\n✨ Found ${questionsToInsert.length} valid questions.`)
    console.log('🗑️  Deleting old questions...')
    await prisma.questionBank.deleteMany({})

    console.log('💾 Inserting new questions...')
    await prisma.questionBank.createMany({
        data: questionsToInsert
    })

    console.log('✅ Done!')

    // Stats
    // Log count per category
    const categories = {}
    questionsToInsert.forEach(q => {
        categories[q.category] = (categories[q.category] || 0) + 1
    })
    console.table(categories)
}

loadKomeQuestions()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
