import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSalesReportsStore() {
  try {
    console.log('🔍 Checking sales reports for store data issues...\n')

    // Get all sales reports
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

    // Filter reports with null or missing storeId
    const reportsWithoutStore = allReports.filter(report => !report.storeId)

    console.log(`❌ Reports with null/missing storeId: ${reportsWithoutStore.length}\n`)

    if (reportsWithoutStore.length > 0) {
      console.log('📋 Details of problematic reports:\n')
      console.log('─'.repeat(100))
      console.log('ID'.padEnd(30), 'IMEI'.padEnd(20), 'SEC User ID'.padEnd(30), 'Submitted At')
      console.log('─'.repeat(100))

      for (const report of reportsWithoutStore) {
        console.log(
          report.id.padEnd(30),
          (report.imei || 'N/A').padEnd(20),
          report.secUserId.padEnd(30),
          report.submittedAt.toISOString()
        )
      }
      console.log('─'.repeat(100))

      // Get SEC user details for these reports
      console.log('\n👤 SEC Users associated with problematic reports:\n')
      const secUserIds = [...new Set(reportsWithoutStore.map(r => r.secUserId))]
      
      for (const secUserId of secUserIds) {
        const secUser = await prisma.sECUser.findUnique({
          where: { id: secUserId },
          include: { store: true }
        })

        if (secUser) {
          const reportCount = reportsWithoutStore.filter(r => r.secUserId === secUserId).length
          console.log(`  • SEC ID: ${secUser.secId || 'N/A'}`)
          console.log(`    Phone: ${secUser.phone}`)
          console.log(`    Name: ${secUser.name || 'N/A'}`)
          console.log(`    Store: ${secUser.store ? `${secUser.store.storeName} (${secUser.store.city})` : 'No store assigned'}`)
          console.log(`    Reports without store: ${reportCount}`)
          console.log('')
        }
      }

      // Summary statistics
      console.log('\n📈 Summary:')
      console.log(`  • Total reports: ${allReports.length}`)
      console.log(`  • Reports with store: ${allReports.length - reportsWithoutStore.length}`)
      console.log(`  • Reports without store: ${reportsWithoutStore.length}`)
      console.log(`  • Percentage affected: ${((reportsWithoutStore.length / allReports.length) * 100).toFixed(2)}%`)
      console.log(`  • Unique SEC users affected: ${secUserIds.length}`)

    } else {
      console.log('✅ All sales reports have valid store data!')
    }

  } catch (error) {
    console.error('❌ Error checking sales reports:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkSalesReportsStore()
  .then(() => {
    console.log('\n✅ Check completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
