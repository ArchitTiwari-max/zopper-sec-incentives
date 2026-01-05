#!/usr/bin/env node

/**
 * Test script to verify the question system works correctly
 * Tests that different SECs get different questions but the same SEC gets consistent questions
 */

const API_URL = 'http://localhost:3001/api'

async function testQuestionSystem() {
    console.log('🧪 Testing Kome Question System\n')

    // Test 1: Check if questions are loaded
    console.log('📊 Test 1: Checking question bank...')
    try {
        const response = await fetch(`${API_URL}/questions`)
        const result = await response.json()

        if (result.success && result.data) {
            console.log(`✅ Question bank loaded: ${result.data.length} questions`)

            // Count questions per category
            const categoryCounts = {}
            result.data.forEach(q => {
                categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1
            })
            console.log('\n📚 Questions per category:')
            console.table(categoryCounts)
        } else {
            console.log('❌ No questions found in database')
            console.log('💡 Run: npm run load-questions')
            return
        }
    } catch (error) {
        console.error('❌ Error fetching questions:', error.message)
        console.log('💡 Make sure the API server is running: npm run dev:api')
        return
    }

    // Test 2: Get questions for different SECs
    console.log('\n🎯 Test 2: Testing unique question generation...')

    const testSECs = ['9876543210', '9876543211', '9876543212']
    const secQuestions = {}

    for (const secId of testSECs) {
        try {
            const response = await fetch(`${API_URL}/questions/unique/${secId}`)
            const result = await response.json()

            if (result.success && result.data) {
                secQuestions[secId] = result.data
                console.log(`✅ SEC ${secId}: Got ${result.data.length} questions`)

                // Show categories
                const categories = result.data.map(q => q.category)
                console.log(`   Categories: ${categories.length} unique`)
            } else {
                console.log(`❌ SEC ${secId}: Failed to get questions`)
            }
        } catch (error) {
            console.error(`❌ SEC ${secId}: Error -`, error.message)
        }
    }

    // Test 3: Verify different SECs get different questions
    console.log('\n🔀 Test 3: Verifying question uniqueness...')

    const sec1Questions = secQuestions[testSECs[0]].map(q => q.id).sort()
    const sec2Questions = secQuestions[testSECs[1]].map(q => q.id).sort()
    const sec3Questions = secQuestions[testSECs[2]].map(q => q.id).sort()

    const sec1vs2Same = sec1Questions.filter(id => sec2Questions.includes(id)).length
    const sec1vs3Same = sec1Questions.filter(id => sec3Questions.includes(id)).length
    const sec2vs3Same = sec2Questions.filter(id => sec3Questions.includes(id)).length

    console.log(`SEC 1 vs SEC 2: ${sec1vs2Same}/10 same questions`)
    console.log(`SEC 1 vs SEC 3: ${sec1vs3Same}/10 same questions`)
    console.log(`SEC 2 vs SEC 3: ${sec2vs3Same}/10 same questions`)

    if (sec1vs2Same < 10 && sec1vs3Same < 10 && sec2vs3Same < 10) {
        console.log('✅ Different SECs get different questions')
    } else {
        console.log('⚠️  SECs are getting identical questions (might be expected if categories have few questions)')
    }

    // Test 4: Verify consistency (same SEC gets same questions)
    console.log('\n🔁 Test 4: Verifying consistency...')

    const secId = testSECs[0]
    try {
        const response1 = await fetch(`${API_URL}/questions/unique/${secId}`)
        const result1 = await response1.json()

        const response2 = await fetch(`${API_URL}/questions/unique/${secId}`)
        const result2 = await response2.json()

        const questions1 = result1.data.map(q => q.id).sort().join(',')
        const questions2 = result2.data.map(q => q.id).sort().join(',')

        if (questions1 === questions2) {
            console.log(`✅ SEC ${secId} gets consistent questions across requests`)
        } else {
            console.log(`❌ SEC ${secId} gets different questions on each request`)
        }
    } catch (error) {
        console.error('❌ Error testing consistency:', error.message)
    }

    // Test 5: Verify all questions have required fields
    console.log('\n📋 Test 5: Verifying question format...')

    const sampleQuestions = secQuestions[testSECs[0]]
    let allValid = true

    sampleQuestions.forEach((q, index) => {
        const hasId = typeof q.id === 'number'
        const hasQuestion = typeof q.question === 'string' && q.question.length > 0
        const hasOptions = Array.isArray(q.options) && q.options.length === 4
        const hasCorrectAnswer = ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
        const hasCategory = typeof q.category === 'string' && q.category.length > 0

        if (!hasId || !hasQuestion || !hasOptions || !hasCorrectAnswer || !hasCategory) {
            console.log(`❌ Question ${index + 1} is invalid:`, {
                hasId, hasQuestion, hasOptions, hasCorrectAnswer, hasCategory
            })
            allValid = false
        }
    })

    if (allValid) {
        console.log('✅ All questions have valid format')
    }

    console.log('\n✨ Test complete!\n')
}

// Run tests
testQuestionSystem().catch(console.error)
