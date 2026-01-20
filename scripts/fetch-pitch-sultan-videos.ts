import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function fetchAndStorePitchSultanVideos() {
  try {
    console.log('📹 Fetching all Pitch Sultan videos...');

    const videos = await prisma.pitchSultanVideo.findMany({
      include: {
        secUser: {
          select: {
            id: true,
            secId: true,
            name: true,
            phone: true,
            region: true,
            store: {
              select: {
                id: true,
                storeName: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    console.log(`✅ Found ${videos.length} videos`);

    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pitch-sultan-videos-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(videos, null, 2));

    console.log(`💾 Data saved to: ${filepath}`);
    console.log(`📊 Total videos: ${videos.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fetchAndStorePitchSultanVideos()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
