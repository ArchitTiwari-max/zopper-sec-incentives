import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteOrphanedReports() {
  try {
    console.log('🗑️  Starting deletion of orphaned sales reports...\n')

    // The 4 report IDs with orphaned store references
    const orphanedReportIds = [
      '6939946e9c98c95ab434a1e2',
      '692e8d354f39ad30e9b69c8f',
      '692e8cca4f39ad30e9b69c8d',
      '68f4b5259033cca3bf785da5'
    ]

    console.log(`📋 Reports to delete: ${orphanedReportIds.length}\n`)

    // Fetch details before deletion for logging
    for (const reportId of orphanedReportIds) {
      const report = await prisma.salesReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          storeId: true,
          imei: true,
          secUserId: true,
          submittedAt: true
        }
      })

      if (report) {
        console.log(`  • Report ID: ${report.id}`)
        console.log(`    IMEI: ${report.imei}`)
        console.log(`    Store ID: ${report.storeId}`)
        console.log(`    Submitted: ${report.submittedAt.toISOString()}`)
        console.log('')
      } else {
        console.log(`  ⚠️  Report ${reportId} not found (may already be deleted)`)
        console.log('')
      }
    }

    // Delete the reports
    console.log('🔄 Deleting reports...\n')
    
    const deleteResult = await prisma.salesReport.deleteMany({
      where: {
        id: {
          in: orphanedReportIds
        }
      }
    })

    console.log(`✅ Successfully deleted ${deleteResult.count} reports\n`)

    // Verify deletion
    console.log('🔍 Verifying deletion...')
    const remainingOrphaned = await prisma.salesReport.findMany({
      where: {
        id: {
          in: orphanedReportIds
        }
      }
    })

    if (remainingOrphaned.length === 0) {
      console.log('✅ All orphaned reports have been successfully deleted!')
    } else {
      console.log(`⚠️  Warning: ${remainingOrphaned.length} reports still exist`)
    }

    // Final count
    const totalReports = await prisma.salesReport.count()
    console.log(`\n📊 Total sales reports remaining: ${totalReports}`)

  } catch (error) {
    console.error('❌ Error deleting orphaned reports:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteOrphanedReports()
  .then(() => {
    console.log('\n✅ Deletion completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deletion failed:', error)
    process.exit(1)
  })
