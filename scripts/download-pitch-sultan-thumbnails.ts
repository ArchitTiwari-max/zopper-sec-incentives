import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();

async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        downloadFile(response.headers.location!, filePath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(filePath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete incomplete file
        reject(err);
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const desktopPath = path.join(process.env.HOME || '/root', 'Desktop', 'pitch-sultan-thumbnails');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(desktopPath)) {
      fs.mkdirSync(desktopPath, { recursive: true });
      console.log(`📁 Created directory: ${desktopPath}`);
    }

    // Fetch all videos with thumbnails
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        thumbnailUrl: {
          not: null
        }
      },
      select: {
        serialNumber: true,
        thumbnailUrl: true
      },
      orderBy: {
        serialNumber: 'asc'
      }
    });

    console.log(`📊 Found ${videos.length} videos with thumbnails`);

    let successCount = 0;
    let failCount = 0;

    for (const video of videos) {
      if (!video.thumbnailUrl) continue;

      try {
        // Extract file extension from URL
        const urlParts = video.thumbnailUrl.split('?')[0]; // Remove query params
        const extension = path.extname(urlParts) || '.jpg'; // Default to .jpg if no extension
        
        const fileName = `${video.serialNumber}${extension}`;
        const filePath = path.join(desktopPath, fileName);

        console.log(`⬇️  Downloading [${video.serialNumber}] ${fileName}...`);
        
        await downloadFile(video.thumbnailUrl, filePath);
        
        console.log(`✅ Downloaded: ${fileName}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to download [${video.serialNumber}]:`, error instanceof Error ? error.message : error);
        failCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Location: ${desktopPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
