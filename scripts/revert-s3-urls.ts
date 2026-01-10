import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function revertS3Urls() {
  console.log('🔍 Reverting S3 URLs back to .mp4.mp4...');
  
  // Find the specific video
  const video = await prisma.pitchSultanVideo.findUnique({
    where: { id: '696295e3a289b6dcb200e49f' }
  });

  if (!video) {
    console.log('❌ Video not found');
    return;
  }

  const oldUrl = video.url;
  const newUrl = oldUrl.replace('.mp4', '.mp4.mp4');
  
  console.log(`🔧 Reverting: ${video.id}`);
  console.log(`   Old: ${oldUrl}`);
  console.log(`   New: ${newUrl}`);
  
  await prisma.pitchSultanVideo.update({
    where: { id: video.id },
    data: { url: newUrl }
  });

  console.log('✅ URL reverted!');
}

revertS3Urls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
