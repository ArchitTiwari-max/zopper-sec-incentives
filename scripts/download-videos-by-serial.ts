import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

const prisma = new PrismaClient();

const DOWNLOAD_FOLDER = process.env.VIDEOS_FOLDER || '/Users/vishalshukla/Desktop/videos';
const START_SERIAL = 1065;
const END_SERIAL = 1069;

function downloadFile(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

async function downloadVideosBySerial() {
  try {
    console.log(`📥 Downloading videos from serial ${START_SERIAL} to ${END_SERIAL}...\n`);

    // Create download folder if it doesn't exist
    if (!fs.existsSync(DOWNLOAD_FOLDER)) {
      fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
    }

    // Fetch videos from database
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        serialNumber: {
          gte: START_SERIAL,
          lte: END_SERIAL
        }
      },
      select: {
        id: true,
        serialNumber: true,
        url: true,
        fileName: true
      },
      orderBy: {
        serialNumber: 'asc'
      }
    });

    console.log(`✅ Found ${videos.length} videos\n`);

    if (videos.length === 0) {
      console.log('❌ No videos found in this serial range');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const filename = `${video.serialNumber}.mp4`;
      const filepath = path.join(DOWNLOAD_FOLDER, filename);

      console.log(`[${i + 1}/${videos.length}] Downloading: ${filename}`);

      try {
        if (!video.url) {
          console.log(`  ❌ No URL found\n`);
          failCount++;
          continue;
        }

        console.log(`  📍 URL: ${video.url}`);
        await downloadFile(video.url, filepath);

        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  ✅ Downloaded: ${sizeMB} MB\n`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        failCount++;
      }
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total: ${videos.length}`);
    console.log(`📂 Saved to: ${DOWNLOAD_FOLDER}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

downloadVideosBySerial()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
