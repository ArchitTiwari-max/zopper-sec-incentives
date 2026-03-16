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

function getFileSizeInMB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

async function main() {
  try {
    const desktopPath = path.join(process.env.HOME || '/root', 'Desktop', 'pitch-sultan-videos');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(desktopPath)) {
      fs.mkdirSync(desktopPath, { recursive: true });
      console.log(`📁 Created directory: ${desktopPath}`);
    }

    // Fetch all videos
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        url: {
          not: ''
        },
        isActive: true
      },
      select: {
        serialNumber: true,
        url: true
      },
      orderBy: {
        serialNumber: 'asc'
      }
    });

    console.log(`📊 Found ${videos.length} active videos`);

    let successCount = 0;
    let failCount = 0;
    let totalSize = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (!video.url) continue;

      const progress = `[${i + 1}/${videos.length}]`;

      try {
        // Extract file extension from URL
        const urlParts = video.url.split('?')[0]; // Remove query params
        const extension = path.extname(urlParts) || '.mp4'; // Default to .mp4 if no extension
        
        const fileName = `${video.serialNumber}${extension}`;
        const filePath = path.join(desktopPath, fileName);

        console.log(`${progress} ⬇️  Downloading [${video.serialNumber}] ${fileName}...`);
        
        await downloadFile(video.url, filePath);
        
        const sizeInMB = getFileSizeInMB(filePath);
        totalSize += sizeInMB;
        
        console.log(`${progress} ✅ Downloaded: ${fileName} (${sizeInMB.toFixed(2)} MB)`);
        successCount++;
      } catch (error) {
        console.error(`${progress} ❌ Failed to download [${video.serialNumber}]:`, error instanceof Error ? error.message : error);
        failCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`💾 Total Size: ${totalSize.toFixed(2)} MB`);
    console.log(`📁 Location: ${desktopPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
