import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate random number between min and max
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Main function
const addLikesConditional = async () => {
  try {
    console.log('🔄 Fetching all videos...');

    // Fetch all videos
    const videos = await prisma.pitchSultanVideo.findMany();
    console.log(`📊 Found ${videos.length} videos`);

    let updatedCount = 0;
    let totalLikesAdded = 0;

    // Process each video
    for (const video of videos) {
      const currentLikes = video.likes || 0;
      let likesToAdd = 0;

      if (currentLikes < 5) {
        // If likes < 5, add random number between 5-10
        likesToAdd = getRandomNumber(5, 10);
        console.log(
          `📈 Video "${video.title}" (Serial: ${video.serialNumber}): ${currentLikes} likes → Adding ${likesToAdd} likes`
        );
      } else if (currentLikes >= 5 && currentLikes < 10) {
        // If likes between 5-10, add random number between 1-5
        likesToAdd = getRandomNumber(1, 5);
        console.log(
          `📈 Video "${video.title}" (Serial: ${video.serialNumber}): ${currentLikes} likes → Adding ${likesToAdd} likes`
        );
      } else {
        // If likes >= 10, skip
        console.log(
          `⏭️  Video "${video.title}" (Serial: ${video.serialNumber}): ${currentLikes} likes (already >= 10, skipping)`
        );
        continue;
      }

      // Update video with new likes
      const newLikes = currentLikes + likesToAdd;
      await prisma.pitchSultanVideo.update(
        {
          where: { id: video.id },
          data: { likes: newLikes }
        }
      );

      updatedCount++;
      totalLikesAdded += likesToAdd;
    }

    console.log('\n✅ Update Complete!');
    console.log(`📊 Videos updated: ${updatedCount}`);
    console.log(`❤️  Total likes added: ${totalLikesAdded}`);

    // Show summary
    const updatedVideos = await prisma.pitchSultanVideo.findMany();
    const likesStats = {
      totalLikes: updatedVideos.reduce((sum, v) => sum + (v.likes || 0), 0),
      avgLikes: (updatedVideos.reduce((sum, v) => sum + (v.likes || 0), 0) / updatedVideos.length).toFixed(2),
      minLikes: Math.min(...updatedVideos.map(v => v.likes || 0)),
      maxLikes: Math.max(...updatedVideos.map(v => v.likes || 0)),
    };

    console.log('\n📈 Likes Statistics:');
    console.log(`   Total likes: ${likesStats.totalLikes}`);
    console.log(`   Average likes: ${likesStats.avgLikes}`);
    console.log(`   Min likes: ${likesStats.minLikes}`);
    console.log(`   Max likes: ${likesStats.maxLikes}`);

    await prisma.$disconnect();
    console.log('\n✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Run the script
addLikesConditional();
