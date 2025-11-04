/**
 * Remove duplicate TestSubmission entries
 * Run this before applying the schema with unique constraint
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function removeDuplicates() {
  try {
    console.log('🔍 Fetching all test submissions...')
    const submissions = await prisma.testSubmission.findMany({
      orderBy: { createdAt: 'desc' } // Keep the most recent ones
    })

    console.log(`📊 Found ${submissions.length} total submissions`)

    // Group by secId + sessionToken
    const grouped = new Map()
    
    submissions.forEach(sub => {
      const key = `${sub.secId}|${sub.sessionToken}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key).push(sub)
    })

    console.log(`📊 Found ${grouped.size} unique (secId, sessionToken) pairs`)

    // Find and remove duplicates
    let duplicatesRemoved = 0
    
    for (const [key, subs] of grouped.entries()) {
      if (subs.length > 1) {
        console.log(`\n⚠️  Found ${subs.length} duplicates for: ${key}`)
        // Keep the first one (most recent due to ordering), delete the rest
        const toDelete = subs.slice(1)
        
        for (const sub of toDelete) {
          console.log(`   🗑️  Deleting: ${sub.id} (submitted: ${sub.submittedAt})`)
          await prisma.testSubmission.delete({
            where: { id: sub.id }
          })
          duplicatesRemoved++
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - Removed ${duplicatesRemoved} duplicate entries`)
    console.log(`   - Kept ${grouped.size} unique submissions`)
    console.log(`\n👉 Now run: npx prisma db push`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicates()
