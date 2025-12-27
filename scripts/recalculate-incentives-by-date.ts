import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Same logic as in api/server.ts
function calculateIncentive(planType: string, modelName?: string): number {
  // For plans without incentive
  if (planType === 'Extended_Warranty_1_Yr' || planType === 'Screen_Protect_1_Yr') {
    return 0
  }
  
  // Test plan
  if (planType === 'Test_Plan') {
    return 1
  }
  
  // Check if model name starts with 'A' (case-insensitive)
  const isASeriesModel = modelName && modelName.trim().toUpperCase().startsWith('A')
  
  // Calculate incentive based on model series
  if (planType === 'ADLD_1_Yr') {
    return isASeriesModel ? 100 : 200  // A-series: ₹100, Others: ₹200
  }
  
  if (planType === 'Combo_2Yrs') {
    return isASeriesModel ? 200 : 300  // A-series: ₹200, Others: ₹300
  }
  
  return 0
}

async function recalculateIncentivesByDate() {
  try {
    // Target date: 25-12-2025 (DD-MM-YYYY)
    const targetDate = '25-12-2025'
    const [day, month, year] = targetDate.split('-').map(Number)
    
    // Create start and end of day in IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - istOffset)
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - istOffset)
    
    console.log(`\n🔄 Recalculating incentives for reports on: ${targetDate}`)
    console.log(`📅 Start: ${startOfDay.toISOString()}`)
    console.log(`📅 End: ${endOfDay.toISOString()}\n`)
    
    // Fetch all reports within the date range
    const reports = await prisma.salesReport.findMany({
      where: {
        submittedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        samsungSKU: {
          select: {
            ModelName: true
          }
        },
        plan: {
          select: {
            planType: true
          }
        }
      },
      orderBy: {
        submittedAt: 'asc'
      }
    })
    
    console.log(`✅ Found ${reports.length} reports for ${targetDate}\n`)
    
    if (reports.length === 0) {
      console.log('No reports found for this date.')
      return
    }
    
    console.log('═'.repeat(120))
    console.log('RECALCULATING INCENTIVES')
    console.log('═'.repeat(120))
    
    let updatedCount = 0
    let unchangedCount = 0
    let totalOldIncentive = 0
    let totalNewIncentive = 0
    
    const updates: Array<{
      id: string
      modelName: string
      planType: string
      oldIncentive: number
      newIncentive: number
      changed: boolean
    }> = []
    
    // Calculate new incentives for all reports
    for (const report of reports) {
      const modelName = report.samsungSKU.ModelName
      const planType = report.plan.planType
      const oldIncentive = report.incentiveEarned
      const newIncentive = calculateIncentive(planType, modelName)
      
      totalOldIncentive += oldIncentive
      totalNewIncentive += newIncentive
      
      const changed = oldIncentive !== newIncentive
      
      updates.push({
        id: report.id,
        modelName,
        planType,
        oldIncentive,
        newIncentive,
        changed
      })
      
      if (changed) {
        updatedCount++
      } else {
        unchangedCount++
      }
    }
    
    // Display changes
    console.log('\nReports requiring updates:')
    updates.forEach((update, index) => {
      if (update.changed) {
        const diff = update.newIncentive - update.oldIncentive
        const diffStr = diff > 0 ? `+₹${diff}` : `₹${diff}`
        console.log(
          `  ${index + 1}. ${update.modelName} (${update.planType.replace(/_/g, ' ')}) - ` +
          `Old: ₹${update.oldIncentive} → New: ₹${update.newIncentive} (${diffStr})`
        )
      }
    })
    
    console.log('\n' + '═'.repeat(120))
    console.log('SUMMARY')
    console.log('═'.repeat(120))
    console.log(`Total Reports: ${reports.length}`)
    console.log(`Reports to Update: ${updatedCount}`)
    console.log(`Reports Unchanged: ${unchangedCount}`)
    console.log(`Old Total Incentive: ₹${totalOldIncentive}`)
    console.log(`New Total Incentive: ₹${totalNewIncentive}`)
    console.log(`Difference: ₹${totalNewIncentive - totalOldIncentive}`)
    console.log('═'.repeat(120))
    
    // Ask for confirmation (in production, you might want to add a CLI prompt)
    console.log('\n⚠️  Starting database update...\n')
    
    // Update all reports with new incentive values
    let successCount = 0
    let errorCount = 0
    
    for (const update of updates) {
      if (update.changed) {
        try {
          await prisma.salesReport.update({
            where: { id: update.id },
            data: { incentiveEarned: update.newIncentive }
          })
          successCount++
          console.log(`✅ Updated report ${update.id}: ₹${update.oldIncentive} → ₹${update.newIncentive}`)
        } catch (error) {
          errorCount++
          console.error(`❌ Failed to update report ${update.id}:`, error)
        }
      }
    }
    
    console.log('\n' + '═'.repeat(120))
    console.log('UPDATE COMPLETE')
    console.log('═'.repeat(120))
    console.log(`✅ Successfully updated: ${successCount} reports`)
    if (errorCount > 0) {
      console.log(`❌ Failed to update: ${errorCount} reports`)
    }
    console.log(`📊 Total incentive changed from ₹${totalOldIncentive} to ₹${totalNewIncentive}`)
    console.log('═'.repeat(120))
    
  } catch (error) {
    console.error('❌ Error recalculating incentives:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
recalculateIncentivesByDate()
