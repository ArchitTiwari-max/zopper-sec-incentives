import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixS3Urls() {
  console.log('🔍 Finding videos with .mp4.mp4 URLs...');
  
  // Find all videos with .mp4.mp4 in the URL
  const videos = await prisma.pitchSultanVideo.findMany({
    where: {
      url: {
        contains: '.mp4.mp4'
      }
    }
  });

  console.log(`📹 Found ${videos.length} videos with double .mp4 extension`);

  if (videos.length === 0) {
    console.log('✅ No videos to fix!');
    return;
  }

  // Fix each video URL
  for (const video of videos) {
    const oldUrl = video.url;
    const newUrl = oldUrl.replace('.mp4.mp4', '.mp4');
    
    console.log(`🔧 Fixing: ${video.id}`);
    console.log(`   Old: ${oldUrl}`);
    console.log(`   New: ${newUrl}`);
    
    await prisma.pitchSultanVideo.update({
      where: { id: video.id },
      data: { url: newUrl }
    });
  }

  console.log('✅ All S3 URLs fixed!');
}

fixS3Urls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
