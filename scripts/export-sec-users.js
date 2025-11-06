import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

/**
 * Export SEC User collection data to Excel
 * Usage: node scripts/export-sec-users.js
 */
async function exportSECUsersToExcel() {
  try {
    console.log('Fetching SEC users from database...');
    
    // Fetch all SEC users with their related store data
    const secUsers = await prisma.sECUser.findMany({
      include: {
        store: {
          select: {
            storeName: true,
            city: true,
          },
        },
        salesReports: {
          select: {
            incentiveEarned: true,
            isPaid: true,
          },
        },
        deductions: {
          select: {
            deductionAmount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${secUsers.length} SEC users`);

    if (secUsers.length === 0) {
      console.log('No SEC users found to export');
      return;
    }

    // Transform data for Excel export
    const excelData = secUsers.map((user) => {
      // Calculate total incentives earned
      const totalIncentiveEarned = user.salesReports.reduce(
        (sum, report) => sum + report.incentiveEarned,
        0
      );

      // Calculate paid incentives
      const paidIncentives = user.salesReports
        .filter((report) => report.isPaid)
        .reduce((sum, report) => sum + report.incentiveEarned, 0);

      // Calculate pending incentives
      const pendingIncentives = totalIncentiveEarned - paidIncentives;

      // Calculate total deductions
      const totalDeductions = user.deductions.reduce(
        (sum, deduction) => sum + deduction.deductionAmount,
        0
      );

      // Calculate total sales reports
      const totalSalesReports = user.salesReports.length;

      return {
        'User ID': user.id,
        'Phone': user.phone,
        'SEC ID': user.secId || 'N/A',
        'Name': user.name || 'N/A',
        'Store Name': user.store?.storeName || 'N/A',
        'City': user.store?.city || 'N/A',
        'Status': user.isActive ? 'Active' : 'Inactive',
        'Total Sales Reports': totalSalesReports,
        'Total Incentive Earned': totalIncentiveEarned,
        'Paid Incentives': paidIncentives,
        'Pending Incentives': pendingIncentives,
        'Total Deductions': totalDeductions,
        'Last Login': user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
        'Created At': new Date(user.createdAt).toLocaleString(),
        'Updated At': new Date(user.updatedAt).toLocaleString(),
      };
    });

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = Object.keys(excelData[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...excelData.map((row) => String(row[key]).length)
      ) + 2,
    }));
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'SEC Users');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = join(__dirname, '..', 'exports');
    
    // Create exports directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `sec-users-export-${timestamp}.xlsx`;
    const filepath = join(outputDir, filename);

    // Write to file
    xlsx.writeFile(workbook, filepath);

    console.log(`\n✅ Export successful!`);
    console.log(`📊 Exported ${secUsers.length} SEC users`);
    console.log(`📁 File saved to: ${filepath}`);
    console.log(`\nSummary:`);
    console.log(`- Total Users: ${secUsers.length}`);
    console.log(`- Active Users: ${secUsers.filter(u => u.isActive).length}`);
    console.log(`- Inactive Users: ${secUsers.filter(u => !u.isActive).length}`);

  } catch (error) {
    console.error('Error exporting SEC users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportSECUsersToExcel()
  .then(() => {
    console.log('\n✨ Export completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
