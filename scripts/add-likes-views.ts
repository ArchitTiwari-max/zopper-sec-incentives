import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addLikesAndViews() {
  try {
    console.log('Starting to add likes and views to all videos...')

    // Get all videos
    const videos = await prisma.pitchSultanVideo.findMany({
      select: { id: true }
    })

    console.log(`Found ${videos.length} videos`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          likes: {
            increment: 39
          },
          views: {
            increment: 200
          }
        }
      })
    }

    console.log(`✅ Successfully added 39 likes and 200 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addLikesAndViews()
