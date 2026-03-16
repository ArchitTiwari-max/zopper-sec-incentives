import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'https://d3necgxvto7is.cloudfront.net/salesdost_sec/Events/PitchSultan/media/videos';
const THUMBNAIL_BASE_URL = 'https://d3necgxvto7is.cloudfront.net/salesdost_sec/Events/PitchSultan/media/photos';

async function updatePitchSultanVideoUrls() {
  try {
    console.log('📹 Fetching all Pitch Sultan videos...');

    const videos = await prisma.pitchSultanVideo.findMany({
      select: {
        id: true,
        serialNumber: true,
        url: true,
        thumbnailUrl: true,
      },
    });

    console.log(`📊 Total videos found: ${videos.length}`);

    // Filter out videos without a serialNumber
    const videosWithSerial = videos.filter((v) => v.serialNumber !== null);
    const videosWithoutSerial = videos.filter((v) => v.serialNumber === null);

    if (videosWithoutSerial.length > 0) {
      console.log(`⚠️  ${videosWithoutSerial.length} videos have no serialNumber and will be SKIPPED:`);
      videosWithoutSerial.forEach((v) => {
        console.log(`   - ID: ${v.id}, current URL: ${v.url}`);
      });
    }

    console.log(`\n🔄 Updating ${videosWithSerial.length} videos...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const video of videosWithSerial) {
      const newUrl = `${BASE_URL}/${video.serialNumber}.mp4`;
      const newThumbnailUrl = `${THUMBNAIL_BASE_URL}/${video.serialNumber}.jpg`;

      try {
        await prisma.pitchSultanVideo.update({
          where: { id: video.id },
          data: { url: newUrl, thumbnailUrl: newThumbnailUrl },
        });

        console.log(`✅ [${video.serialNumber}] url: ${newUrl} | thumbnail: ${newThumbnailUrl}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to update video ID ${video.id} (serial: ${video.serialNumber}):`, err);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ❌ Failed:  ${errorCount}`);
    console.log(`   ⏭️  Skipped (no serial): ${videosWithoutSerial.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePitchSultanVideoUrls()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
