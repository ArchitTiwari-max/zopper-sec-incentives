import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

// Load .env file
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
const DESKTOP_WINNERS_FOLDER = path.join(os.homedir(), 'Desktop', 'Winners');
const TEMP_FOLDER = './temp-winners-compress';

async function compressImage(inputPath: string, outputPath: string, tier: number = 1): Promise<boolean> {
  try {
    let cmd: string;
    
    if (tier === 1) {
      // First tier: moderate compression
      cmd = `ffmpeg -i "${inputPath}" -q:v 5 -vf "scale=1200:-1" "${outputPath}" -y`;
    } else if (tier === 2) {
      // Second tier: aggressive compression
      cmd = `ffmpeg -i "${inputPath}" -q:v 8 -vf "scale=800:-1" "${outputPath}" -y`;
    } else {
      // Third tier: very aggressive compression
      cmd = `ffmpeg -i "${inputPath}" -q:v 10 -vf "scale=600:-1" "${outputPath}" -y`;
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
        ContentType: 'image/jpeg'
      })
    );
    
    return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  } catch (error) {
    console.error(`❌ Upload failed for ${filename}:`, error);
    return null;
  }
}

async function processWinnersImages() {
  try {
    // Check if Winners folder exists
    if (!fs.existsSync(DESKTOP_WINNERS_FOLDER)) {
      console.error(`❌ Winners folder not found at: ${DESKTOP_WINNERS_FOLDER}`);
      process.exit(1);
    }

    console.log(`📁 Reading Winners folder: ${DESKTOP_WINNERS_FOLDER}\n`);

    // Get all image files
    const files = fs.readdirSync(DESKTOP_WINNERS_FOLDER)
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    if (files.length === 0) {
      console.log('❌ No image files found in Winners folder');
      process.exit(1);
    }

    console.log(`🖼️  Found ${files.length} image(s)\n`);

    if (!fs.existsSync(TEMP_FOLDER)) {
      fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    }

    const results: { filename: string; originalSize: string; compressedSize: string; url: string | null; status: string }[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
      const inputPath = path.join(DESKTOP_WINNERS_FOLDER, file);
      const originalSize = fs.statSync(inputPath).size;
      const originalSizeKB = (originalSize / 1024).toFixed(2);

      console.log(`\n🖼️  Processing: ${file}`);
      console.log(`   Original size: ${originalSizeKB}KB`);

      // Check if already under 200KB
      if (originalSize <= MAX_SIZE_BYTES) {
        console.log(`   ✅ Already under ${MAX_SIZE_KB}KB, uploading directly...`);
        const url = await uploadToS3(inputPath, file);
        if (url) {
          console.log(`   ✅ Uploaded: ${url}`);
          results.push({
            filename: file,
            originalSize: `${originalSizeKB}KB`,
            compressedSize: `${originalSizeKB}KB`,
            url,
            status: 'uploaded (no compression needed)'
          });
          successCount++;
        } else {
          console.log(`   ❌ Upload failed`);
          results.push({
            filename: file,
            originalSize: `${originalSizeKB}KB`,
            compressedSize: '-',
            url: null,
            status: 'upload failed'
          });
          failedCount++;
        }
        continue;
      }

      // Compress
      const outputPath = path.join(TEMP_FOLDER, `compressed_${file}`);
      console.log(`   ⚙️  Compressing...`);
      
      let success = false;
      let compressedSize = 0;
      let compressedSizeKB = '0';
      
      // Try compression tiers
      for (let tier = 1; tier <= 3; tier++) {
        const tierSuccess = await compressImage(inputPath, outputPath, tier);
        if (!tierSuccess) {
          console.log(`   ❌ Tier ${tier} compression failed`);
          continue;
        }

        compressedSize = fs.statSync(outputPath).size;
        compressedSizeKB = (compressedSize / 1024).toFixed(2);
        const compressionPercent = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

        console.log(`   📊 Tier ${tier} Compressed: ${compressedSizeKB}KB (${compressionPercent}% smaller)`);

        if (compressedSize <= MAX_SIZE_BYTES) {
          success = true;
          break;
        } else {
          console.log(`   ⚠️  Still too large, trying next tier...`);
        }
      }

      if (!success) {
        console.log(`   ❌ All compression tiers failed - SKIPPING`);
        results.push({
          filename: file,
          originalSize: `${originalSizeKB}KB`,
          compressedSize: compressedSizeKB,
          url: null,
          status: 'all compression tiers failed'
        });
        failedCount++;
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        continue;
      }

      if (compressedSize > MAX_SIZE_BYTES) {
        console.log(`   ❌ Still too large (${compressedSizeKB}KB > ${MAX_SIZE_KB}KB) - SKIPPING`);
        results.push({
          filename: file,
          originalSize: `${originalSizeKB}KB`,
          compressedSize: `${compressedSizeKB}KB`,
          url: null,
          status: `too large (${compressedSizeKB}KB)`
        });
        failedCount++;
        fs.unlinkSync(outputPath);
        continue;
      }

      // Upload compressed version
      console.log(`   📤 Uploading...`);
      const url = await uploadToS3(outputPath, file);
      
      if (url) {
        console.log(`   ✅ Uploaded: ${url}`);
        results.push({
          filename: file,
          originalSize: `${originalSizeKB}KB`,
          compressedSize: `${compressedSizeKB}KB`,
          url,
          status: 'uploaded'
        });
        successCount++;
      } else {
        results.push({
          filename: file,
          originalSize: `${originalSizeKB}KB`,
          compressedSize: `${compressedSizeKB}KB`,
          url: null,
          status: 'upload failed'
        });
        failedCount++;
      }

      // Cleanup temp file
      fs.unlinkSync(outputPath);
    }

    // Save results to JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `exports/winners-images-${timestamp}.json`;
    
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${outputFile}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Uploaded: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📁 Total: ${files.length}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    // Cleanup temp folder
    if (fs.existsSync(TEMP_FOLDER)) {
      fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
    }
  }
}

processWinnersImages()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
