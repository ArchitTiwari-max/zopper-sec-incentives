import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeviceIncentives() {
  try {
    console.log('🔍 Checking incentive definitions for all devices...\n');

    // Fetch all Samsung SKUs with their plans
    const devices = await prisma.samsungSKU.findMany({
      include: {
        plans: true,
      },
      orderBy: {
        Category: 'asc',
      },
    });

    if (devices.length === 0) {
      console.log('❌ No devices found in the database.');
      return;
    }

    console.log(`📱 Total Devices: ${devices.length}\n`);
    console.log('═'.repeat(80));

    // Group by category
    const categories = new Map<string, typeof devices>();
    devices.forEach(device => {
      const category = device.Category || 'Uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(device);
    });

    // Display by category
    for (const [category, categoryDevices] of categories) {
      console.log(`\n📂 Category: ${category}`);
      console.log('─'.repeat(80));

      for (const device of categoryDevices) {
        console.log(`\n  📱 Model: ${device.ModelName}`);
        console.log(`     ID: ${device.id}`);
        
        if (device.plans.length === 0) {
          console.log('     ⚠️  No plans/incentives defined');
        } else {
          console.log(`     💰 Plans & Incentives (${de