/**
 * PDF Question Extractor Helper
 * 
 * This script helps format questions extracted from the Samsung ProtectMax PDF
 * into the correct format for the load-samsung-questions.ts script.
 * 
 * Instructions:
 * 1. Manually copy questions from the PDF
 * 2. Paste them into the rawQuestions object below
 * 3. Run this script to get properly formatted output
 * 4. Copy the output into load-samsung-questions.ts
 */

// Paste your raw questions here in this format:
const rawQuestions = {
  "Product Knowledge": [
    // Example format - replace with actual questions from PDF:
    "Q: What is the main benefit of Samsung ProtectMax Screen Protection?\nA) Water resistance\nB) Impact protection\nC) Battery life extension\nD) Camera enhancement\nAnswer: B",
    
    "Q: Which Samsung devices are eligible for ProtectMax coverage?\nA) All Samsung phones\nB) Only flagship models\nC) Samsung phones purchased from authorized dealers\nD) Only foldable phones\nAnswer: C",
    
    // Add more questions here...
  ],
  
  "Technical Specifications": [
    "Q: What is the warranty period for Samsung ProtectMax Extended Warranty?\nA) 6 months\nB) 1 year\nC) 2 years\nD) 3 years\nAnswer: B",
    
    // Add more questions here...
  ],
  
  "Installation Process": [
    "Q: What is the first step in Samsung ProtectMax installation?\nA) Clean the screen\nB) Remove old protector\nC) Check device compatibility\nD) Apply adhesive\nAnswer: C",
    
    // Add more questions here...
  ],
  
  "Customer Service": [
    "Q: How should you handle a customer complaint about screen protector bubbles?\nA) Ignore it\nB) Offer replacement\nC) Blame customer\nD) Refer to manager\nAnswer: B",
    
    // Add more questions here...
  ],
  
  "Sales Process": [
    "Q: What is the recommended approach when selling Samsung ProtectMax?\nA) Focus on price\nB) Highlight features and benefits\nC) Compare with competitors\nD) Offer discounts\nAnswer: B",
    
    // Add more questions here...
  ],
  
  "Troubleshooting": [
    "Q: If a customer reports touch sensitivity issues after installation, what should you check first?\nA) Screen cleanliness\nB) Protector alignment\nC) Device settings\nD) Warranty status\nAnswer: B",
    
    // Add more questions here...
  ],
  
  "Warranty & Claims": [
    "Q: What documentation is required for a Samsung ProtectMax warranty claim?\nA) Receipt only\nB) IMEI and receipt\nC) Customer ID\nD) Installation certificate\nAnswer: B",
    
    // Add more questions here...
  ],
  
  "Compliance & Safety": [
    "Q: What safety precaution should be taken during screen protector installation?\nA) Wear gloves\nB) Use proper lighting\nC) Clean workspace\nD) All of the above\nAnswer: D",
    
    // Add more questions here...
  ],
  
  "Product Variants": [
    "Q: Which Samsung ProtectMax variant offers the highest level of protection?\nA) Basic Screen Protect\nB) ADLD Protection\nC) Combo Protection\nD) Extended Warranty\nAnswer: C",
    
    // Add more questions here...
  ],
  
  "Business Knowledge": [
    "Q: What is the primary goal of the Samsung ProtectMax program?\nA) Increase sales\nB) Customer satisfaction\nC) Market dominance\nD) All of the above\nAnswer: D",
    
    // Add more questions here...
  ]
}

/**
 * Parse a raw question string into structured format
 */
function parseQuestion(rawQuestion) {
  const lines = rawQuestion.trim().split('\n')
  
  // Find question line (starts with Q:)
  const questionLine = lines.find(line => line.startsWith('Q:'))
  if (!questionLine) return null
  
  const question = questionLine.replace('Q:', '').trim()
  
  // Find option lines (A), B), C), D))
  const options = []
  const optionPattern = /^[A-D]\)/
  
  lines.forEach(line => {
    if (optionPattern.test(line.trim())) {
      options.push(line.trim())
    }
  })
  
  // Find answer line
  const answerLine = lines.find(line => line.startsWith('Answer:'))
  if (!answerLine) return null
  
  const correctAnswer = answerLine.replace('Answer:', '').trim()
  
  return {
    question,
    options,
    correctAnswer
  }
}

/**
 * Format questions for the TypeScript file
 */
function formatQuestionsForTypeScript() {
  console.log('// Samsung ProtectMax 10 Categories Question Data')
  console.log('// Generated from PDF extraction')
  console.log('const samsungQuestions = {')
  
  for (const [category, questions] of Object.entries(rawQuestions)) {
    console.log(`  // Category: ${category}`)
    console.log(`  "${category}": [`)
    
    questions.forEach((rawQuestion, index) => {
      const parsed = parseQuestion(rawQuestion)
      if (parsed) {
        console.log('    {')
        console.log(`      question: "${parsed.question.replace(/"/g, '\\"')}",`)
        console.log(`      options: [${parsed.options.map(opt => `"${opt.replace(/"/g, '\\"')}"`).join(', ')}],`)
        console.log(`      correctAnswer: "${parsed.correctAnswer}"`)
        console.log('    }' + (index < questions.length - 1 ? ',' : ''))
      } else {
        console.log(`    // Error parsing question ${index + 1}`)
      }
    })
    
    console.log('  ],')
    console.log('')
  }
  
  console.log('}')
}

/**
 * Validate the extracted questions
 */
function validateQuestions() {
  console.log('📊 QUESTION VALIDATION REPORT')
  console.log('='.repeat(50))
  
  let totalQuestions = 0
  let validQuestions = 0
  let errors = []
  
  for (const [category, questions] of Object.entries(rawQuestions)) {
    console.log(`\n📚 Category: ${category}`)
    console.log(`   Total questions: ${questions.length}`)
    
    let categoryValid = 0
    
    questions.forEach((rawQuestion, index) => {
      totalQuestions++
      const parsed = parseQuestion(rawQuestion)
      
      if (parsed) {
        if (parsed.options.length >= 2 && parsed.correctAnswer) {
          validQuestions++
          categoryValid++
        } else {
          errors.push(`${category} - Question ${index + 1}: Invalid format`)
        }
      } else {
        errors.push(`${category} - Question ${index + 1}: Parse error`)
      }
    })
    
    console.log(`   Valid questions: ${categoryValid}`)
    console.log(`   Success rate: ${((categoryValid / questions.length) * 100).toFixed(1)}%`)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`📈 OVERALL SUMMARY`)
  console.log(`Total questions: ${totalQuestions}`)
  console.log(`Valid questions: ${validQuestions}`)
  console.log(`Success rate: ${((validQuestions / totalQuestions) * 100).toFixed(1)}%`)
  
  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`)
    errors.forEach(error => console.log(`   ${error}`))
  }
  
  if (validQuestions === totalQuestions) {
    console.log('\n🎉 All questions are valid!')
  }
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2]
  
  console.log('📱 SAMSUNG PROTECTMAX PDF QUESTION EXTRACTOR')
  console.log('='.repeat(50))
  
  switch (command) {
    case 'validate':
      validateQuestions()
      break
    case 'format':
      formatQuestionsForTypeScript()
      break
    default:
      console.log('📖 Available commands:')
      console.log('   node scripts/pdf-question-extractor-helper.js validate  - Validate extracted questions')
      console.log('   node scripts/pdf-question-extractor-helper.js format    - Format for TypeScript file')
      console.log('')
      console.log('💡 Instructions:')
      console.log('1. Extract questions from Samsung_ProtectMax_10_Categories_Full_QA.pdf')
      console.log('2. Paste them into the rawQuestions object in this file')
      console.log('3. Run "validate" to check format')
      console.log('4. Run "format" to get TypeScript output')
      console.log('5. Copy output into scripts/load-samsung-questions.ts')
  }
}

// Run the script
main()