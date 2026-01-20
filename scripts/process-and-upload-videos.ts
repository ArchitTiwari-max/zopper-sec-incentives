import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'vishal-zopper';
const VIDEOS_FOLDER = process.env.VIDEOS_FOLDER || './Desktop/videos';
const TEMP_FOLDER = './temp-processed-videos';
const START_SERIAL = 1065;
const END_SERIAL = 1069;
const MIN_FILE_SIZE_MB = 12;

async function processAndUploadVideos() {
  try {
    console.log('🎬 Starting video processing and upload...\n');

    // Create temp folder
    if (!fs.existsSync(TEMP_FOLDER)) {
      fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    }

    // Get all MP4 files in range 1065-1069 with size > 12MB
    const allVideoFiles = fs.readdirSync(VIDEOS_FOLDER).filter(f => f.endsWith('.mp4'));
    
    const videoFiles = allVideoFiles.filter(f => {
      const serialNum = parseInt(f.replace('.mp4', ''));
      if (serialNum < START_SERIAL || serialNum > END_SERIAL) return false;
      
      const filepath = path.join(VIDEOS_FOLDER, f);
      const stats = fs.statSync(filepath);
      const sizeMB = stats.size / (1024 * 1024);
      return sizeMB > MIN_FILE_SIZE_MB;
    });

    console.log(`📁 Found ${videoFiles.length} videos in range ${START_SERIAL}-${END_SERIAL} (>12MB)\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videoFiles.length; i++) {
      const filename = videoFiles[i];
      const serialNumber = filename.replace('.mp4', '');
      const inputPath = path.join(VIDEOS_FOLDER, filename);
      const outputPath = path.join(TEMP_FOLDER, filename);

      console.log(`[${i + 1}/${videoFiles.length}] Processing: ${filename}`);

      try {
        // Step 1: Get original file size
        const originalStats = fs.statSync(inputPath);
        const originalSizeMB = (originalStats.size / (1024 * 1024)).toFixed(2);
        console.log(`  📊 Original size: ${originalSizeMB} MB`);

        // Step 2: Process with FFmpeg
        console.log(`  ⚙️  Encoding with FFmpeg...`);
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -map_metadata -1 -movflags +faststart -vf "scale=720:-2,fps=30" -c:v libx264 -profile:v high -level 3.1 -preset fast -crf 25 -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -threads 0 "${outputPath}" -y`;
        
        execSync(ffmpegCmd, { stdio: 'pipe' });
        console.log(`  ✅ Encoded successfully`);

        // Step 3: Get encoded file size
        const stats = fs.statSync(outputPath);
        const encodedSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const compressionPercent = (((originalStats.size - stats.size) / originalStats.size) * 100).toFixed(1);
        console.log(`  📊 Encoded size: ${encodedSizeMB} MB`);
        console.log(`  💾 Compression: ${compressionPercent}% smaller\n`);

        // Step 4: Upload to S3
        console.log(`  📤 Uploading to S3...`);
        const s3Key = `media/${filename}`;
        const fileStream = fs.createReadStream(outputPath);

        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileStream,
            ContentType: 'video/mp4',
            Metadata: {
              'serial-number': serialNumber,
              'processed-date': new Date().toISOString()
            }
          })
        );

        console.log(`  ✅ Uploaded to S3: s3://${BUCKET_NAME}/${s3Key}`);

        // Step 5: Update database
        console.log(`  🗄️  Updating database...`);
        const s3Url = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${s3Key}`;
        
        await prisma.pitchSultanVideo.updateMany({
          where: {
            serialNumber: parseInt(serialNumber)
          },
          data: {
            url: s3Url
          }
        });

        console.log(`  ✅ Database updated\n`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        failCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total: ${videoFiles.length}`);
    console.log('='.repeat(50) + '\n');

    // Cleanup temp folder
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

processAndUploadVideos()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
