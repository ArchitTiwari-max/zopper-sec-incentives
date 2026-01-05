import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Samsung ProtectMax 10 Categories Questions
// Based on typical Samsung ProtectMax training content
const samsungQuestions = {
  "Product Knowledge": [
    {
      question: "What does Samsung ProtectMax cover?",
      options: ["A) Only screen damage", "B) Accidental and liquid damage", "C) Only manufacturing defects", "D) Battery issues only"],
      correctAnswer: "B"
    },
    {
      question: "What is the coverage period for Samsung ProtectMax?",
      options: ["A) 6 months", "B) 1 year", "C) 2 years", "D) 3 years"],
      correctAnswer: "B"
    },
    {
      question: "Which Samsung devices are eligible for ProtectMax?",
      options: ["A) All Samsung phones", "B) Only flagship models", "C) Samsung phones from authorized dealers", "D) Only foldable phones"],
      correctAnswer: "C"
    },
    {
      question: "What is the maximum claim value under ProtectMax?",
      options: ["A) 50% of device value", "B) Up to device invoice value", "C) Fixed amount of ₹10,000", "D) No limit"],
      correctAnswer: "B"
    },
    {
      question: "How many claims can be made in one year?",
      options: ["A) Only 1 claim", "B) Maximum 3 claims", "C) Unlimited within invoice value", "D) 5 claims maximum"],
      correctAnswer: "C"
    }
  ],

  "Purchase & Eligibility": [
    {
      question: "Within how many days must ProtectMax be purchased after buying the phone?",
      options: ["A) 3 days", "B) 7 days", "C) 15 days", "D) 30 days"],
      correctAnswer: "B"
    },
    {
      question: "Can ProtectMax be purchased for a phone bought online?",
      options: ["A) No, only offline purchases", "B) Yes, from any online platform", "C) Only from Samsung official online store", "D) Yes, if from authorized online retailers"],
      correctAnswer: "D"
    },
    {
      question: "What happens if a customer wants to buy ProtectMax after 7 days?",
      options: ["A) Can buy with penalty", "B) Not eligible", "C) Can buy with diagnostics", "D) Can buy at higher price"],
      correctAnswer: "B"
    },
    {
      question: "Who can use the phone under the same ProtectMax plan?",
      options: ["A) Only the buyer", "B) Buyer's spouse only", "C) Spouse, children, and parents", "D) Anyone in the family"],
      correctAnswer: "C"
    },
    {
      question: "Can ProtectMax be transferred to a new device?",
      options: ["A) Yes, anytime", "B) Yes, with fee", "C) No, stays with registered device", "D) Only once per year"],
      correctAnswer: "C"
    }
  ],

  "Claims & Process": [
    {
      question: "What is required to raise a ProtectMax claim?",
      options: ["A) Only phone IMEI", "B) Device and plan invoice", "C) Police complaint", "D) Warranty card"],
      correctAnswer: "B"
    },
    {
      question: "Is there a processing fee for claims?",
      options: ["A) No fee", "B) Yes, for every claim", "C) Only for first claim", "D) Only for liquid damage"],
      correctAnswer: "B"
    },
    {
      question: "When does ProtectMax coverage start?",
      options: ["A) 7 days after purchase", "B) Immediately after plan activation", "C) After first premium payment", "D) 30 days after purchase"],
      correctAnswer: "B"
    },
    {
      question: "What should be done if a customer's phone is damaged on the same day as buying ProtectMax?",
      options: ["A) Not covered", "B) Covered if damage is after activation", "C) Need to wait 7 days", "D) Only manufacturing defects covered"],
      correctAnswer: "B"
    },
    {
      question: "How to confirm if a ProtectMax plan is active?",
      options: ["A) Check confirmation email/SMS", "B) Call Samsung Care+", "C) Contact Zopper POC", "D) All of the above"],
      correctAnswer: "D"
    }
  ],

  "Coverage Details": [
    {
      question: "Does ProtectMax cover screen cracks?",
      options: ["A) No", "B) Yes, as accidental physical damage", "C) Only if entire screen is broken", "D) Only with additional premium"],
      correctAnswer: "B"
    },
    {
      question: "Is camera glass damage covered under ProtectMax?",
      options: ["A) No, camera parts excluded", "B) Yes, counts as accidental damage", "C) Only if entire camera module fails", "D) Only manufacturing defects"],
      correctAnswer: "B"
    },
    {
      question: "What should be used first for manufacturing defects - warranty or ProtectMax?",
      options: ["A) ProtectMax first", "B) Warranty should be used first", "C) Either can be used", "D) Depends on device age"],
      correctAnswer: "B"
    },
    {
      question: "Does ProtectMax cover water damage?",
      options: ["A) No water damage coverage", "B) Yes, liquid damage is covered", "C) Only accidental spills", "D) Only if phone is not water-resistant"],
      correctAnswer: "B"
    },
    {
      question: "Can ProtectMax be used for theft or loss?",
      options: ["A) Yes, theft is covered", "B) No, only physical and liquid damage", "C) Only with police report", "D) Theft covered with additional premium"],
      correctAnswer: "B"
    }
  ],

  "Customer Service": [
    {
      question: "How should you handle a customer complaint about screen protector bubbles?",
      options: ["A) Ignore the complaint", "B) Offer immediate replacement", "C) Blame customer installation", "D) Refer to manager only"],
      correctAnswer: "B"
    },
    {
      question: "What to do if customer is confused about ProtectMax vs warranty?",
      options: ["A) Tell them they're the same", "B) Explain warranty covers manufacturing, ProtectMax covers accidental", "C) Recommend warranty only", "D) Suggest buying both separately"],
      correctAnswer: "B"
    },
    {
      question: "If a customer accuses you of hiding ProtectMax limitations, how should you respond?",
      options: ["A) Apologize and offer refund", "B) Stay calm, show official terms, clarify politely", "C) Escalate immediately", "D) Deny any limitations exist"],
      correctAnswer: "B"
    },
    {
      question: "How to convince a hesitant customer about ProtectMax benefits?",
      options: ["A) Focus only on price", "B) Highlight protection against accidents warranty doesn't cover", "C) Compare negatively with competitors", "D) Offer unauthorized discounts"],
      correctAnswer: "B"
    },
    {
      question: "What to tell a parent buying phone for child regarding coverage?",
      options: ["A) Coverage only for buyer", "B) Children are covered under family provision", "C) Need separate plan for child", "D) Only spouse can use phone"],
      correctAnswer: "B"
    }
  ],

  "Technical Support": [
    {
      question: "If customer reports touch sensitivity issues after screen protector installation, what to check first?",
      options: ["A) Screen cleanliness", "B) Protector alignment", "C) Device settings", "D) Warranty status"],
      correctAnswer: "B"
    },
    {
      question: "What is the first step in screen protector installation?",
      options: ["A) Clean the screen", "B) Remove old protector", "C) Check device compatibility", "D) Apply adhesive"],
      correctAnswer: "C"
    },
    {
      question: "What safety precautions should be taken during installation?",
      options: ["A) Wear gloves", "B) Use proper lighting", "C) Clean workspace", "D) All of the above"],
      correctAnswer: "D"
    },
    {
      question: "How to handle installation errors?",
      options: ["A) Ignore minor bubbles", "B) Restart installation process", "C) Blame customer", "D) Use force to fix"],
      correctAnswer: "B"
    },
    {
      question: "What tools are essential for proper installation?",
      options: ["A) Only cleaning cloth", "B) Cleaning cloth and squeegee", "C) Professional installation kit", "D) No tools needed"],
      correctAnswer: "C"
    }
  ],

  "Sales Process": [
    {
      question: "What is the recommended approach when selling ProtectMax?",
      options: ["A) Focus only on price", "B) Highlight features and benefits", "C) Compare negatively with competitors", "D) Offer unauthorized discounts"],
      correctAnswer: "B"
    },
    {
      question: "When should ProtectMax be offered to customers?",
      options: ["A) Only if customer asks", "B) During phone purchase discussion", "C) After phone is delivered", "D) Only for expensive phones"],
      correctAnswer: "B"
    },
    {
      question: "How to explain ProtectMax value proposition?",
      options: ["A) Cheapest insurance available", "B) Comprehensive protection beyond warranty", "C) Same as manufacturer warranty", "D) Only for clumsy users"],
      correctAnswer: "B"
    },
    {
      question: "What to do if customer says 'I'll think about it'?",
      options: ["A) Let them go", "B) Explain 7-day purchase window", "C) Offer discount", "D) Pressure them to decide"],
      correctAnswer: "B"
    },
    {
      question: "How to handle price objections?",
      options: ["A) Offer unauthorized discount", "B) Explain cost vs potential repair expenses", "C) Say price is non-negotiable", "D) Compare with most expensive option"],
      correctAnswer: "B"
    }
  ],

  "Documentation": [
    {
      question: "What documents are needed for ProtectMax enrollment?",
      options: ["A) Only phone invoice", "B) Phone invoice and customer ID", "C) Phone invoice, customer details, and IMEI", "D) Just customer phone number"],
      correctAnswer: "C"
    },
    {
      question: "How is ProtectMax activation confirmed?",
      options: ["A) Email confirmation only", "B) SMS confirmation only", "C) Email and SMS confirmation", "D) No confirmation sent"],
      correctAnswer: "C"
    },
    {
      question: "What information must be recorded during enrollment?",
      options: ["A) Customer name only", "B) Phone model and IMEI", "C) Complete customer and device details", "D) Just phone number"],
      correctAnswer: "C"
    },
    {
      question: "How long should enrollment documents be retained?",
      options: ["A) 30 days", "B) 6 months", "C) 1 year", "D) Throughout plan duration"],
      correctAnswer: "D"
    },
    {
      question: "What to do if customer loses enrollment confirmation?",
      options: ["A) Cannot help", "B) Provide copy from system", "C) Ask them to re-enroll", "D) Direct to Samsung service center"],
      correctAnswer: "B"
    }
  ],

  "Compliance & Policies": [
    {
      question: "What is the primary goal of Samsung ProtectMax program?",
      options: ["A) Increase sales only", "B) Customer satisfaction and protection", "C) Market dominance", "D) Profit maximization"],
      correctAnswer: "B"
    },
    {
      question: "How should customer data be handled?",
      options: ["A) Can be shared freely", "B) Only for marketing purposes", "C) Strictly confidential and secure", "D) Only with Samsung"],
      correctAnswer: "C"
    },
    {
      question: "What to do if you don't know answer to customer question?",
      options: ["A) Make up an answer", "B) Admit you don't know and find out", "C) Refer to competitor", "D) Ignore the question"],
      correctAnswer: "B"
    },
    {
      question: "How to handle customer complaints?",
      options: ["A) Dismiss them", "B) Listen, document, and resolve appropriately", "C) Blame the customer", "D) Refer all to manager"],
      correctAnswer: "B"
    },
    {
      question: "What is the importance of accurate information?",
      options: ["A) Not important", "B) Critical for customer trust and compliance", "C) Only matters for expensive phones", "D) Can be flexible"],
      correctAnswer: "B"
    }
  ],

  "Business Knowledge": [
    {
      question: "Who is the insurance partner for Samsung ProtectMax?",
      options: ["A) Samsung directly", "B) Zopper", "C) Third-party insurer through Zopper", "D) Local insurance company"],
      correctAnswer: "C"
    },
    {
      question: "What is Zopper's role in ProtectMax?",
      options: ["A) Device manufacturer", "B) Insurance facilitator and service provider", "C) Repair center", "D) Sales agent only"],
      correctAnswer: "B"
    },
    {
      question: "How does ProtectMax benefit the retailer?",
      options: ["A) No benefit", "B) Additional revenue and customer satisfaction", "C) Only commission", "D) Reduced liability"],
      correctAnswer: "B"
    },
    {
      question: "What makes ProtectMax different from other device insurance?",
      options: ["A) Cheaper price", "B) Samsung partnership and comprehensive coverage", "C) Longer coverage period", "D) No processing fee"],
      correctAnswer: "B"
    },
    {
      question: "Why is ProtectMax important for Samsung ecosystem?",
      options: ["A) Increases phone sales", "B) Enhances customer experience and loyalty", "C) Reduces warranty claims", "D) Eliminates competition"],
      correctAnswer: "B"
    }
  ]
}

/**
 * Load Samsung ProtectMax questions into database
 */
async function loadSamsungQuestions() {
  console.log('🚀 Starting Samsung ProtectMax Questions Import')
  console.log('📚 Loading questions from 10 categories\n')

  try {
    // Clear existing questions
    console.log('🗑️  Clearing existing questions...')
    const deletedCount = await prisma.questionBank.deleteMany({})
    console.log(`✅ Deleted ${deletedCount.count} existing questions\n`)

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

    // Test unique distribution
    console.log('\n🧪 Testing unique question distribution...')
    const testSECs = ['SEC001', 'SEC002', 'SEC003', 'SEC004', 'SEC005']
    
    for (const secId of testSECs) {
      const uniqueQuestions = await getUniqueQuestionsForSEC(secId)
      console.log(`   ${secId}: ${uniqueQuestions.length} unique questions from ${uniqueQuestions.length} categories`)
    }

  } catch (error) {
    console.log('💥 Error during import:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Database connection closed')
  }
}

/**
 * Get unique questions for a SEC
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
  loadSamsungQuestions().catch((error) => {
    console.log('💥 Unexpected error:')
    console.error('❌', error)
    process.exit(1)
  })
}

export { loadSamsungQuestions, getUniqueQuestionsForSEC }