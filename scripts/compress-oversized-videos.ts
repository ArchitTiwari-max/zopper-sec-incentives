import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const prisma = new PrismaClient();

const BUCKET_NAME = 'vishal-zopper';
const CLOUDFRONT_DOMAIN = 'd2f4sgw13r1zfn.cloudfront.net';
const TEMP_FOLDER = './temp-compress-videos';
const START_SERIAL = 1049;
const END_SERIAL = 1069;
const MAX_SIZE_MB = 15;

// Compression tiers
const TIERS = [
  {
    name: 'Tier 1',
    crf: '25',
    bitrate: '2000k',
    fps: '30'
  },
  {
    name: 'Tier 2',
    crf: '28',
    bitrate: '1500k',
    fps: '30'
  },
  {
    name: 'Tier 3',
    crf: '32',
    bitrate: '1000k',
    fps: '24'
  }
];

async function getS3FileSize(key: string): Promise<number> {
  try {
    const response = await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })
    );
    return response.ContentLength || 0;
  } catch (error) {
    return 0;
  }
}

async function downloadFromS3(key: string, filepath: string): Promise<void> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
  );

  const stream = response.Body as Readable;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    stream.pipe(file);
    file.on('finish', () => resolve());
    file.on('error', reject);
  });
}

async function uploadToS3(filepath: string, key: string): Promise<void> {
  const fileStream = fs.createReadStream(filepath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: 'video/mp4'
    })
  );
}

async function compressVideo(inputPath: string, outputPath: string, tier: typeof TIERS[0]): Promise<boolean> {
  try {
    const cmd = `ffmpeg -i "${inputPath}" -map_metadata -1 -movflags +faststart -vf "scale=720:-2,fps=${tier.fps}" -c:v libx264 -profile:v high -level 3.1 -preset fast -crf ${tier.crf} -b:v ${tier.bitrate} -maxrate ${tier.bitrate} -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -threads 0 "${outputPath}" -y`;
    
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function processOversizedVideos() {
  try {
    console.log(`🎬 Checking videos ${START_SERIAL}-${END_SERIAL} for size > ${MAX_SIZE_MB}MB\n`);

    if (!fs.existsSync(TEMP_FOLDER)) {
      fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    }

    let oversizedCount = 0;
    let compressedCount = 0;
    let skippedCount = 0;

    for (let serial = START_SERIAL; serial <= END_SERIAL; serial++) {
      const s3Key = `media/${serial}.mp4`;
      const sizeMB = (await getS3FileSize(s3Key)) / (1024 * 1024);

      if (sizeMB === 0) {
        console.log(`⏭️  [${serial}] Not found in S3`);
        continue;
      }

      if (sizeMB <= MAX_SIZE_MB) {
        console.log(`✅ [${serial}] ${sizeMB.toFixed(2)}MB - OK`);
        continue;
      }

      console.log(`\n⚠️  [${serial}] Original: ${sizeMB.toFixed(2)}MB - OVERSIZED (need to compress to ≤${MAX_SIZE_MB}MB)`);
      oversizedCount++;

      const inputPath = path.join(TEMP_FOLDER, `${serial}_original.mp4`);
      let compressed = false;

      // Download ONCE before trying tiers
      console.log(`  📥 Downloading (${sizeMB.toFixed(2)}MB)...`);
      await downloadFromS3(s3Key, inputPath);
      const downloadedSize = fs.statSync(inputPath).size / (1024 * 1024);
      console.log(`  ✅ Downloaded: ${downloadedSize.toFixed(2)}MB\n`);

      // Try each tier
      for (let tierIdx = 0; tierIdx < TIERS.length; tierIdx++) {
        const tier = TIERS[tierIdx];
        const outputPath = path.join(TEMP_FOLDER, `${serial}_${tier.name.replace(' ', '')}.mp4`);

        console.log(`  ⚙️  Trying ${tier.name} (CRF ${tier.crf}, ${tier.bitrate})...`);
        const success = await compressVideo(inputPath, outputPath, tier);

        if (!success) {
          console.log(`  ❌ ${tier.name} failed`);
          continue;
        }

        const compressedSize = fs.statSync(outputPath).size / (1024 * 1024);
        const compressionPercent = (((downloadedSize - compressedSize) / downloadedSize) * 100).toFixed(1);
        console.log(`  📊 Compressed: ${compressedSize.toFixed(2)}MB (${compressionPercent}% smaller)`);

        if (compressedSize <= MAX_SIZE_MB) {
          console.log(`  ✅ ${tier.name} SUCCESS! Uploading...`);
          await uploadToS3(outputPath, s3Key);
          console.log(`  ✅ Uploaded to S3`);
          
          // Update database with CloudFront URL
          const cloudFrontUrl = `https://${CLOUDFRONT_DOMAIN}/media/${serial}.mp4`;
          const video = await prisma.pitchSultanVideo.findFirst({
            where: { serialNumber: serial }
          });
          if (video) {
            await prisma.pitchSultanVideo.update({
              where: { id: video.id },
              data: { url: cloudFrontUrl }
            });
            console.log(`  🗄️  Database updated with CloudFront URL`);
          }
          
          compressed = true;
          compressedCount++;
          break;
        } else {
          console.log(`  ❌ Still too large (${compressedSize.toFixed(2)}MB > ${MAX_SIZE_MB}MB), trying next tier...`);
        }
      }

      if (!compressed) {
        console.log(`  ⛔ All tiers failed - SKIPPING`);
        skippedCount++;
      }

      // Cleanup temp files for this serial
      const tempFiles = fs.readdirSync(TEMP_FOLDER).filter(f => f.startsWith(`${serial}_`));
      tempFiles.forEach(f => fs.unlinkSync(path.join(TEMP_FOLDER, f)));
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`⚠️  Oversized: ${oversizedCount}`);
    console.log(`✅ Compressed: ${compressedCount}`);
    console.log(`⛔ Skipped: ${skippedCount}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

processOversizedVideos()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
