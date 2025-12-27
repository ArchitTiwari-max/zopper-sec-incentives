import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fetchReportsByDate() {
  try {
    // Target date: 25-12-2025 (DD-MM-YYYY)
    const targetDate = '25-12-2025'
    const [day, month, year] = targetDate.split('-').map(Number)
    
    // Create start and end of day in IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - istOffset)
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - istOffset)
    
    console.log(`\n🔍 Fetching reports for date: ${targetDate}`)
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
        secUser: {
          select: {
            phone: true,
            name: true,
            secId: true
          }
        },
        store: {
          select: {
            storeName: true,
            city: true
          }
        },
        samsungSKU: {
          select: {
            ModelName: true,
            Category: true
          }
        },
        plan: {
          select: {
            planType: true,
            price: true
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
    
    // Display summary
    let totalIncentive = 0
    
    console.log('═'.repeat(120))
    console.log('SALES REPORTS FOR 25-12-2025')
    console.log('═'.repeat(120))
    
    reports.forEach((report, index) => {
      totalIncentive += report.incentiveEarned
      
      console.log(`\n📊 Report #${index + 1}`)
      console.log(`   ID: ${report.id}`)
      console.log(`   SEC: ${report.secUser.name || 'N/A'} (${report.secUser.phone})`)
      console.log(`   SEC ID: ${report.secUser.secId || 'N/A'}`)
      console.log(`   Store: ${report.store.storeName}, ${report.store.city}`)
      console.log(`   Device: ${report.samsungSKU.ModelName} (${report.samsungSKU.Category})`)
      console.log(`   Plan: ${report.plan.planType.replace(/_/g, ' ')}`)
      console.log(`   Plan Price: ₹${report.planPrice}`)
      console.log(`   IMEI: ${report.imei}`)
      console.log(`   Incentive Earned: ₹${report.incentiveEarned}`)
      console.log(`   Payment Status: ${report.isPaid ? '✅ Paid' : '⏳ Pending'}`)
      console.log(`   Submitted At: ${report.submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`)
    })
    
    console.log('\n' + '═'.repeat(120))
    console.log('SUMMARY')
    console.log('═'.repeat(120))
    console.log(`Total Reports: ${reports.length}`)
    console.log(`Total Incentive Earned: ₹${totalIncentive}`)
    
    // Group by plan type
    const byPlanType = reports.reduce((acc, r) => {
      const planType = r.plan.planType
      if (!acc[planType]) {
        acc[planType] = { count: 0, incentive: 0 }
      }
      acc[planType].count++
      acc[planType].incentive += r.incentiveEarned
      return acc
    }, {} as Record<string, { count: number; incentive: number }>)
    
    console.log('\nBreakdown by Plan Type:')
    Object.entries(byPlanType).forEach(([planType, data]) => {
      console.log(`  ${planType.replace(/_/g, ' ')}: ${data.count} reports, ₹${data.incentive} incentive`)
    })
    
    // Group by device model
    const byModel = reports.reduce((acc, r) => {
      const model = r.samsungSKU.ModelName
      if (!acc[model]) {
        acc[model] = { count: 0, incentive: 0 }
      }
      acc[model].count++
      acc[model].incentive += r.incentiveEarned
      return acc
    }, {} as Record<string, { count: number; incentive: number }>)
    
    console.log('\nBreakdown by Device Model:')
    Object.entries(byModel).forEach(([model, data]) => {
      console.log(`  ${model}: ${data.count} reports, ₹${data.incentive} incentive`)
    })
    
    // Payment status
    const paidCount = reports.filter(r => r.isPaid).length
    const pendingCount = reports.length - paidCount
    const paidAmount = reports.filter(r => r.isPaid).reduce((sum, r) => sum + r.incentiveEarned, 0)
    const pendingAmount = totalIncentive - paidAmount
    
    console.log('\nPayment Status:')
    console.log(`  Paid: ${paidCount} reports, ₹${paidAmount}`)
    console.log(`  Pending: ${pendingCount} reports, ₹${pendingAmount}`)
    
    console.log('\n' + '═'.repeat(120))
    
  } catch (error) {
    console.error('❌ Error fetching reports:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fetchReportsByDate()
