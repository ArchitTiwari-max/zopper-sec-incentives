import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

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
    const desktopPath = path.join(process.env.HOME || '/root', 'Desktop', 'pitch-sultan-winner-photos');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(desktopPath)) {
      fs.mkdirSync(desktopPath, { recursive: true });
      console.log(`📁 Created directory: ${desktopPath}`);
    }

    // Winner IDs (based on the public/assets/winners folder)
    const winnerIds = [1002, 1003, 1004, 1005];
    const baseUrl = 'https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners';

    console.log(`📊 Found ${winnerIds.length} winner photos to download\n`);

    let successCount = 0;
    let failCount = 0;
    let totalSize = 0;

    for (let i = 0; i < winnerIds.length; i++) {
      const winnerId = winnerIds[i];
      const progress = `[${i + 1}/${winnerIds.length}]`;

      try {
        const fileName = `${winnerId}.png`;
        const filePath = path.join(desktopPath, fileName);
        const url = `${baseUrl}/${fileName}`;

        console.log(`${progress} ⬇️  Downloading winner photo [${winnerId}]...`);
        
        await downloadFile(url, filePath);
        
        const sizeInMB = getFileSizeInMB(filePath);
        totalSize += sizeInMB;
        
        console.log(`${progress} ✅ Downloaded: ${fileName} (${sizeInMB.toFixed(2)} MB)`);
        successCount++;
      } catch (error) {
        console.error(`${progress} ❌ Failed to download [${winnerId}]:`, error instanceof Error ? error.message : error);
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
  }
}

main();
