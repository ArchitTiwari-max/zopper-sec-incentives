import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = 'vishal-zopper';
const S3_FOLDER = 'media/Pitchsultan_winners';
const CLOUDFRONT_DOMAIN = 'd2f4sgw13r1zfn.cloudfront.net';
const MAX_SIZE_KB = 200;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
const TEMP_FOLDER = './temp-single-compress';

async function compressImage(inputPath: string, outputPath: string, tier: number = 1): Promise<boolean> {
  try {
    let cmd: string;
    
    if (tier === 1) {
      cmd = `ffmpeg -i "${inputPath}" -q:v 5 -vf "scale=1200:-1" "${outputPath}" -y`;
    } else if (tier === 2) {
      cmd = `ffmpeg -i "${inputPath}" -q:v 8 -vf "scale=800:-1" "${outputPath}" -y`;
    } else if (tier === 3) {
      cmd = `ffmpeg -i "${inputPath}" -q:v 10 -vf "scale=600:-1" "${outputPath}" -y`;
    } else if (tier === 4) {
      cmd = `ffmpeg -i "${inputPath}" -q:v 12 -vf "scale=400:-1" "${outputPath}" -y`;
    } else {
      cmd = `ffmpeg -i "${inputPath}" -q:v 15 -vf "scale=300:-1" "${outputPath}" -y`;
    }
    
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function uploadToS3(filepath: string, filename: string): Promise<string | null> {
  try {
    const fileStream = fs.createReadStream(filepath);
    const s3Key = `${S3_FOLDER}/${filename}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'image/png'
      })
    );
    
    return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  } catch (error) {
    console.error(`❌ Upload failed:`, error);
    return null;
  }
}

async function uploadSingleImage() {
  try {
    const DESKTOP_WINNERS_FOLDER = path.join(os.homedir(), 'Desktop', 'Winners');
    const filename = '1047.png';
    const inputPath = path.join(DESKTOP_WINNERS_FOLDER, filename);

    if (!fs.existsSync(inputPath)) {
      console.error(`❌ File not found: ${inputPath}`);
      process.exit(1);
    }

    const originalSize = fs.statSync(inputPath).size;
    const originalSizeKB = (originalSize / 1024).toFixed(2);

    console.log(`🖼️  Processing: ${filename}`);
    console.log(`   Original size: ${originalSizeKB}KB\n`);

    if (!fs.existsSync(TEMP_FOLDER)) {
      fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    }

    let uploaded = false;
    let finalUrl: string | null = null;
    let bestCompressedSize = originalSize;
    let bestOutputPath = '';

    // Try compression tiers
    for (let tier = 1; tier <= 5; tier++) {
      const outputPath = path.join(TEMP_FOLDER, `compressed_tier${tier}_${filename}`);
      
      console.log(`   ⚙️  Tier ${tier} compressing...`);
      const success = await compressImage(inputPath, outputPath, tier);
      
      if (!success) {
        console.log(`   ❌ Tier ${tier} compression failed`);
        continue;
      }

      const compressedSize = fs.statSync(outputPath).size;
      const compressedSizeKB = (compressedSize / 1024).toFixed(2);
      const compressionPercent = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

      console.log(`   📊 Tier ${tier}: ${compressedSizeKB}KB (${compressionPercent}% smaller)`);

      // Keep track of best compression
      if (compressedSize < bestCompressedSize) {
        bestCompressedSize = compressedSize;
        bestOutputPath = outputPath;
      }

      if (compressedSize <= MAX_SIZE_BYTES) {
        console.log(`   ✅ Fits within ${MAX_SIZE_KB}KB! Uploading...`);
        const url = await uploadToS3(outputPath, filename);
        if (url) {
          console.log(`   ✅ Uploaded: ${url}`);
          finalUrl = url;
          uploaded = true;
          break;
        }
      } else {
        console.log(`   ⚠️  Still too large (${compressedSizeKB}KB > ${MAX_SIZE_KB}KB), trying next tier...`);
      }

      if (tier < 5) fs.unlinkSync(outputPath);
    }

    // If still not under 200KB, upload the best compressed version anyway
    if (!uploaded && bestOutputPath && fs.existsSync(bestOutputPath)) {
      console.log(`\n⚠️  Could not compress to ${MAX_SIZE_KB}KB, uploading best compression...`);
      const url = await uploadToS3(bestOutputPath, filename);
      if (url) {
        console.log(`   ✅ Uploaded: ${url}`);
        finalUrl = url;
        uploaded = true;
      }
      fs.unlinkSync(bestOutputPath);
    }

    if (!uploaded) {
      console.log(`\n❌ Could not upload`);
    } else {
      console.log(`\n✅ Successfully uploaded!`);
      const bestSizeKB = (bestCompressedSize / 1024).toFixed(2);
      console.log(`\nJSON entry:`);
      console.log(JSON.stringify({
        filename,
        originalSize: `${originalSizeKB}KB`,
        compressedSize: `${bestSizeKB}KB`,
        url: finalUrl,
        status: 'uploaded'
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    if (fs.existsSync(TEMP_FOLDER)) {
      fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
    }
  }
}

uploadSingleImage()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
