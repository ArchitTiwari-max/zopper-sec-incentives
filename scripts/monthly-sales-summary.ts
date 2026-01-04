import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function parseArgs() {
  const argv = process.argv.slice(2)
  const out: { year?: number; month?: number; writeFile?: boolean } = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--year' && argv[i + 1]) { out.year = Number(argv[++i]) }
    else if (a === '--month' && argv[i + 1]) { out.month = Number(argv[++i]) }
    else if (a === '--write') { out.writeFile = true }
  }
  return out
}

function startEndFor(year: number, month: number) {
  // month: 1-12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  return { start, end }
}

function fmtAmt(n: number) { return `₹${(n / 1).toFixed(0)}` }

async function run() {
  const args = parseArgs()
  const now = new Date()
  const year = args.year ?? now.getFullYear()
  const month = args.month ?? (now.getMonth() + 1)

  const { start, end } = startEndFor(year, month)

  console.log(`Summarizing sales from ${start.toISOString()} to ${end.toISOString()} (UTC)`)

  const reports = await prisma.salesReport.findMany({
    where: {
      submittedAt: {
        gte: start,
        lt: end,
      }
    },
    include: {
      secUser: true,
      store: true,
      plan: true,
      samsungSKU: true,
    }
  })

  const summary: any = {
    period: `${year}-${String(month).padStart(2, '0')}`,
    reportCount: reports.length,
    totalIncentive: 0,
    totalPlanValue: 0,
    paidCount: 0,
    paidIncentiveTotal: 0,
    averageIncentive: 0,
    byPlan: {} as Record<string, { count: number; totalIncentive: number; totalPlanValue: number }> ,
    byStore: {} as Record<string, { count: number; totalIncentive: number; totalPlanValue: number }>,
    bySEC: {} as Record<string, { count: number; totalIncentive: number }>,
  }

  for (const r of reports) {
    summary.totalIncentive += (r.incentiveEarned || 0)
    summary.totalPlanValue += (r.planPrice || 0)
    if (r.isPaid) {
      summary.paidCount += 1
      summary.paidIncentiveTotal += (r.incentiveEarned || 0)
    }

    const planKey = r.plan?.planType ?? 'UNKNOWN'
    if (!summary.byPlan[planKey]) summary.byPlan[planKey] = { count: 0, totalIncentive: 0, totalPlanValue: 0 }
    summary.byPlan[planKey].count++
    summary.byPlan[planKey].totalIncentive += (r.incentiveEarned || 0)
    summary.byPlan[planKey].totalPlanValue += (r.planPrice || 0)

    const storeKey = r.store?.storeName ? `${r.store.storeName} - ${r.store.city || ''}` : 'UNKNOWN'
    if (!summary.byStore[storeKey]) summary.byStore[storeKey] = { count: 0, totalIncentive: 0, totalPlanValue: 0 }
    summary.byStore[storeKey].count++
    summary.byStore[storeKey].totalIncentive += (r.incentiveEarned || 0)
    summary.byStore[storeKey].totalPlanValue += (r.planPrice || 0)

    const secKey = r.secUser?.secId || r.secUser?.phone || 'UNKNOWN'
    if (!summary.bySEC[secKey]) summary.bySEC[secKey] = { count: 0, totalIncentive: 0 }
    summary.bySEC[secKey].count++
    summary.bySEC[secKey].totalIncentive += (r.incentiveEarned || 0)
  }

  summary.averageIncentive = summary.reportCount ? summary.totalIncentive / summary.reportCount : 0

  // Top performers
  summary.topStores = Object.entries(summary.byStore)
    .map(([k, v]) => ({ store: k, ...v }))
    .sort((a, b) => b.totalIncentive - a.totalIncentive)
    .slice(0, 10)

  summary.topSECs = Object.entries(summary.bySEC)
    .map(([k, v]) => ({ sec: k, ...v }))
    .sort((a, b) => b.totalIncentive - a.totalIncentive)
    .slice(0, 10)

  summary.byPlanList = Object.entries(summary.byPlan).map(([k, v]) => ({ plan: k, ...v }))

  // Pretty print
  console.log('--- Summary ---')
  console.log(`Reports: ${summary.reportCount}`)
  console.log(`Total plan value: ${fmtAmt(summary.totalPlanValue)}`)
  console.log(`Total incentive (earned): ${fmtAmt(summary.totalIncentive)}`)
  console.log(`Paid reports: ${summary.paidCount}, paid incentive total: ${fmtAmt(summary.paidIncentiveTotal)}`)
  console.log(`Average incentive per report: ${fmtAmt(summary.averageIncentive)}`)
  console.log('\nTop stores by incentive:')
  summary.topStores.forEach((s: any, i: number) => {
    console.log(`${i + 1}. ${s.store} — reports: ${s.count}, incentive: ${fmtAmt(s.totalIncentive)}, planValue: ${fmtAmt(s.totalPlanValue)}`)
  })

  console.log('\nTop SECs by incentive:')
  summary.topSECs.forEach((s: any, i: number) => {
    console.log(`${i + 1}. ${s.sec} — reports: ${s.count}, incentive: ${fmtAmt(s.totalIncentive)}`)
  })

  console.log('\nPlan breakdown:')
  summary.byPlanList.forEach((p: any) => {
    console.log(`${p.plan} — reports: ${p.count}, incentive: ${fmtAmt(p.totalIncentive)}, planValue: ${fmtAmt(p.totalPlanValue)}`)
  })

  if (args.writeFile) {
    const outDir = path.join(process.cwd(), 'scripts', 'output')
    try { fs.mkdirSync(outDir, { recursive: true }) } catch (e) {}
    const outPath = path.join(outDir, `monthly-summary-${summary.period}.json`)
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
    console.log(`\nWrote JSON summary to ${outPath}`)
  }

  await prisma.$disconnect()
}

run().catch(async (e) => {
  console.error('Error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
