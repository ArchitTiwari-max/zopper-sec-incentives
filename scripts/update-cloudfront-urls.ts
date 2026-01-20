import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const S3_DOMAIN = 'vishal-zopper.s3.ap-south-1.amazonaws.com';
const CLOUDFRONT_DOMAIN = 'd2f4sgw13r1zfn.cloudfront.net';

async function updateCloudFrontUrls() {
  try {
    console.log('🔄 Updating URLs from S3 to CloudFront...');
    console.log(`From: ${S3_DOMAIN}`);
    console.log(`To: ${CLOUDFRONT_DOMAIN}`);

    // Fetch all videos with S3 URLs
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        url: {
          contains: S3_DOMAIN
        }
      }
    });

    console.log(`Found ${videos.length} videos with S3 URLs`);

    // Update each video
    let updatedCount = 0;
    for (const video of videos) {
      const newUrl = video.url.replace(S3_DOMAIN, CLOUDFRONT_DOMAIN);
      const newThumbnailUrl = video.thumbnailUrl?.replace(S3_DOMAIN, CLOUDFRONT_DOMAIN);

      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          url: newUrl,
          ...(newThumbnailUrl && { thumbnailUrl: newThumbnailUrl })
        }
      });

      updatedCount++;
    }

    console.log(`✅ Updated ${updatedCount} videos`);

    // Verify
    const updated = await prisma.pitchSultanVideo.findMany({
      where: {
        url: {
          contains: CLOUDFRONT_DOMAIN
        }
      },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true
      },
      take: 3
    });

    console.log('\n📋 Sample updated videos:');
    updated.forEach(v => {
      console.log(`  URL: ${v.url}`);
    });

    console.log('\n✅ Update completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateCloudFrontUrls()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
