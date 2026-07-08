import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
// @ts-ignore
import { Jimp } from 'jimp';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'zopper-bucket';

// Helper to stream S3 body to buffer
const streamToBuffer = async (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

async function zoomoutThumbnail(serialNumber: number) {
  console.log(`🔍 Finding video with serial number: ${serialNumber}...`);
  
  const video = await prisma.pitchSultanVideo.findFirst({
    where: { serialNumber }
  });

  if (!video) {
    console.error(`❌ Video with serial number ${serialNumber} not found.`);
    return;
  }

  const rawUrl = video.thumbnailUrl || video.url;
  if (!rawUrl) {
    console.error('❌ Video has no URL or thumbnailUrl.');
    return;
  }

  console.log(`📹 Video Found: "${video.title}"`);
  console.log(`   Current URL: ${rawUrl}`);

  // Extract S3 key
  let s3Key = '';
  if (rawUrl.includes('cloudfront.net/')) {
    s3Key = rawUrl.split('cloudfront.net/')[1];
  } else if (rawUrl.includes('amazonaws.com/')) {
    s3Key = rawUrl.split('amazonaws.com/')[1];
  } else {
    console.error('❌ URL is not an S3/CloudFront URL.');
    return;
  }

  // Clean S3 Key
  s3Key = decodeURIComponent(s3Key.replace(/\+/g, ' '));
  console.log(`🔑 S3 Key extracted: "${s3Key}"`);

  // Download original image from S3
  console.log(`📥 Downloading image from S3 bucket: "${bucketName}"...`);
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key
  });

  const response = await s3Client.send(getCommand);
  const imageBuffer = await streamToBuffer(response.Body);

  console.log('🖼️ Processing image with Jimp...');
  const image = await Jimp.read(imageBuffer);
  
  const width = image.width;
  const height = image.height;
  console.log(`   Dimensions: ${width}x${height} (Aspect ratio: ${(width / height).toFixed(2)})`);

  // Determine target 16:9 size (pillarboxing)
  let targetWidth = width;
  let targetHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  // We want to fit the image inside a 16:9 box
  // 16:9 aspect ratio = 1.777
  const currentRatio = width / height;
  const targetRatio = 16 / 9;

  if (currentRatio < targetRatio) {
    // Image is narrower than 16:9 (e.g. vertical 9:16 or square)
    // We pad the sides: height remains same, width increases to height * 1.777
    targetWidth = Math.round(height * targetRatio);
    offsetX = Math.round((targetWidth - width) / 2);
  } else {
    // Image is wider than 16:9
    // We pad top/bottom: width remains same, height increases to width / 1.777
    targetHeight = Math.round(width / targetRatio);
    offsetY = Math.round((targetHeight - height) / 2);
  }

  console.log(`   Target 16:9 Size: ${targetWidth}x${targetHeight}`);
  console.log(`   Offsets: X=${offsetX}, Y=${offsetY}`);

  // Create new 16:9 canvas with black background (using hex format 0x000000ff for Jimp v1)
  const canvas = new Jimp({ width: targetWidth, height: targetHeight, color: 0x000000ff });
  
  // Composite original image in the center
  canvas.composite(image, offsetX, offsetY);

  // Get buffer
  const processedBuffer = await canvas.getBuffer('image/png');

  // Generate new S3 key to bypass CDN caching
  const timestamp = Date.now();
  const fileBasename = path.basename(s3Key);
  const cleanBasename = fileBasename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const newS3Key = `salesdost_sec/Events/cutomer_ki_awaaz/media/images/zoomout-${timestamp}-${cleanBasename}.png`;

  console.log(`📤 Uploading zoomout thumbnail to S3: "${newS3Key}"...`);
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: newS3Key,
    Body: processedBuffer,
    ContentType: 'image/png'
  });

  await s3Client.send(putCommand);

  // Construct new URL (using CloudFront domain if original had it)
  let newUrl = '';
  if (rawUrl.includes('d3necgxvto7is.cloudfront.net')) {
    newUrl = `https://d3necgxvto7is.cloudfront.net/${newS3Key}`;
  } else {
    newUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${newS3Key}`;
  }

  console.log(`💾 Updating Database with new thumbnailUrl: "${newUrl}"...`);
  await prisma.pitchSultanVideo.update({
    where: { id: video.id },
    data: { thumbnailUrl: newUrl }
  });

  console.log('✅ Thumbnail zoomout complete and database updated successfully!');
}

const serial = parseInt(process.argv[2] || '1071', 10);
zoomoutThumbnail(serial)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
