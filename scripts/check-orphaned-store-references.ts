import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkOrphanedStoreReferences() {
  try {
    console.log('🔍 Checking for orphaned store references in sales reports...\n')

    // Get all sales reports with their storeIds
    const allReports = await prisma.salesReport.findMany({
      select: {
        id: true,
        storeId: true,
        secUserId: true,
        imei: true,
        submittedAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total sales reports: ${allReports.length}`)

    // Get all valid store IDs
    const allStores = await prisma.store.findMany({
      select: {
        id: true,
        storeName: true,
        city: true
      }
    })

    const validStoreIds = new Set(allStores.map(s => s.id))
    console.log(`🏪 Total stores in database: ${allStores.length}\n`)

    // Find reports with storeIds that don't exist in Store table
    const orphanedReports = allReports.filter(report => 
      report.storeId && !validStoreIds.has(report.storeId)
    )

    console.log(`❌ Reports with orphaned store references: ${orphanedReports.length}\n`)

    if (orphanedReports.length > 0) {
      console.log('📋 Details of reports with orphaned store references:\n')
      console.log('─'.repeat(120))
      console.log('Report ID'.padEnd(30), 'Invalid Store ID'.padEnd(30), 'IMEI'.padEnd(20), 'Submitted At')
      console.log('─'.repeat(120))

      for (const report of orphanedReports.slice(0, 20)) { // Show first 20
        console.log(
          report.id.padEnd(30),
          (report.storeId || 'N/A').padEnd(30),
          (report.imei || 'N/A').padEnd(20),
          report.submittedAt.toISOString()
        )
      }
      
      if (orphanedReports.length > 20) {
        console.log(`... and ${orphanedReports.length - 20} more`)
      }
      console.log('─'.repeat(120))

      // Get unique orphaned store IDs
      const orphanedStoreIds = [...new Set(orphanedReports.map(r => r.storeId).filter(Boolean))]
      console.log(`\n🔗 Unique orphaned store IDs: ${orphanedStoreIds.length}`)
      console.log('\nOrphaned Store IDs:')
      orphanedStoreIds.forEach(storeId => {
        const count = orphanedReports.filter(r => r.storeId === storeId).length
        console.log(`  • ${storeId} (${count} reports)`)
      })

      // Get SEC user details for these reports
      console.log('\n👤 SEC Users associated with orphaned reports:\n')
      const secUserIds = [...new Set(orphanedReports.map(r => r.secUserId))]
      
      for (const secUserId of secUserIds.slice(0, 10)) { // Show first 10
        const secUser = await prisma.sECUser.findUnique({
          where: { id: secUserId },
          include: { store: true }
        })

        if (secUser) {
          const reportCount = orphanedReports.filter(r => r.secUserId === secUserId).length
          console.log(`  • SEC ID: ${secUser.secId || 'N/A'}`)
          console.log(`    Phone: ${secUser.phone}`)
          console.log(`    Name: ${secUser.name || 'N/A'}`)
          console.log(`    Current Store: ${secUser.store ? `${secUser.store.storeName} (${secUser.store.city})` : 'No store assigned'}`)
          console.log(`    Orphaned reports: ${reportCount}`)
          console.log('')
        }
      }

      if (secUserIds.length > 10) {
        console.log(`  ... and ${secUserIds.length - 10} more SEC users`)
      }

      // Summary statistics
      console.log('\n📈 Summary:')
      console.log(`  • Total reports: ${allReports.length}`)
      console.log(`  • Reports with valid store references: ${allReports.length - orphanedReports.length}`)
      console.log(`  • Reports with orphaned store references: ${orphanedReports.length}`)
      console.log(`  • Percentage affected: ${((orphanedReports.length / allReports.length) * 100).toFixed(2)}%`)
      console.log(`  • Unique orphaned store IDs: ${orphanedStoreIds.length}`)
      console.log(`  • Unique SEC users affected: ${secUserIds.length}`)

    } else {
      console.log('✅ All sales reports have valid store references!')
    }

  } catch (error) {
    console.error('❌ Error checking orphaned references:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkOrphanedStoreReferences()
  .then(() => {
    console.log('\n✅ Check completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
