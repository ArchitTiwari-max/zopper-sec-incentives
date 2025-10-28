import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of IMEIs to remove vouchers from
const imeiToRemove = [
  '35628196064517',
  '35214089030',
  '35290154810028',
  '3529015483255720',
  '35290154800208',
  '35717822865123',
  '8806095859637',
  '3561377744056470',
  '35628537860769',
  '8806097448365',
  '3529015488432940',
  '35290154832164',
  '3562845377723950',
  '35841083477602',
  '35487234553064',
  '35290154866588',
  '35685861005502',
  '35290154812270',
  '352901548256378000'
];

async function removeVouchers() {
  try {
    console.log(`🔄 Starting removal of voucher codes from ${imeiToRemove.length} IMEIs...`);
    
    const results = {
      total: imeiToRemove.length,
      removed: 0,
      notFound: 0,
      errors: 0,
      details: []
    };

    for (const imei of imeiToRemove) {
      try {
        // Find the report with this IMEI
        const report = await prisma.salesReport.findUnique({
          where: { imei: imei }
        });

        if (!report) {
          console.log(`❌ Not found: IMEI ${imei}`);
          results.notFound++;
          results.details.push({
            imei,
            status: 'not_found',
            message: 'Report not found in database'
          });
          continue;
        }

        if (!report.voucherCode) {
          console.log(`⏭️  Skip: IMEI ${imei} (no voucher code)`);
          results.details.push({
            imei,
            status: 'skipped',
            message: 'No voucher code assigned'
          });
          continue;
        }

        // Update the report to remove voucher code
        const updated = await prisma.salesReport.update({
          where: { imei: imei },
          data: {
            voucherCode: null,
            isPaid: false,
            paidAt: null
          }
        });

        console.log(`✅ Removed: IMEI ${imei} (was: ${report.voucherCode})`);
        results.removed++;
        results.details.push({
          imei,
          status: 'removed',
          message: `Removed voucher: ${report.voucherCode}`
        });

      } catch (error) {
        console.error(`⚠️  Error: IMEI ${imei} - ${error.message}`);
        results.errors++;
        results.details.push({
          imei,
          status: 'error',
          message: error.message
        });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total IMEIs: ${results.total}`);
    console.log(`   Removed: ${results.removed}`);
    console.log(`   Not Found: ${results.notFound}`);
    console.log(`   Errors: ${results.errors}`);
    
    // Print detailed summary
    console.log('\n📋 Details:');
    results.details.forEach(detail => {
      console.log(`   [${detail.status.toUpperCase()}] ${detail.imei}: ${detail.message}`);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeVouchers();
