import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check total videos
    const totalVideos = await prisma.pitchSultanVideo.count();
    console.log(`📊 Total videos: ${totalVideos}`);

    // Check active videos
    const activeVideos = await prisma.pitchSultanVideo.count({
      where: { isActive: true }
    });
    console.log(`✅ Active videos: ${activeVideos}`);

    // Check inactive videos
    const inactiveVideos = await prisma.pitchSultanVideo.count({
      where: { isActive: false }
    });
    console.log(`❌ Inactive videos: ${inactiveVideos}`);

    // Show first 5 active videos
    if (activeVideos > 0) {
      console.log('\n📹 First 5 active videos:');
      const videos = await prisma.pitchSultanVideo.findMany({
        where: { isActive: true },
        select: {
          id: true,
          serialNumber: true,
          title: true,
          isActive: true,
          uploadedAt: true
        },
        take: 5,
        orderBy: { uploadedAt: 'desc' }
      });
      videos.forEach((v, i) => {
        console.log(`  ${i + 1}. [${v.serialNumber}] ${v.title || 'Untitled'} - Active: ${v.isActive}`);
      });
    } else {
      console.log('\n⚠️  No active videos found!');
      console.log('\n📹 First 5 videos (any status):');
      const videos = await prisma.pitchSultanVideo.findMany({
        select: {
          id: true,
          serialNumber: true,
          title: true,
          isActive: true,
          uploadedAt: true
        },
        take: 5,
        orderBy: { uploadedAt: 'desc' }
      });
      videos.forEach((v, i) => {
        console.log(`  ${i + 1}. [${v.serialNumber}] ${v.title || 'Untitled'} - Active: ${v.isActive}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
