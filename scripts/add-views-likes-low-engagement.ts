import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addViewsLikesLowEngagement() {
  try {
    console.log('Starting to add views and likes to low engagement videos...')

    // Get videos with likes < 5
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        likes: { lt: 5 }
      },
      select: { id: true, likes: true, views: true }
    })

    console.log(`Found ${videos.length} videos with likes < 5`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          views: {
            increment: 40
          },
          likes: {
            increment: 8
          }
        }
      })
      console.log(`Updated video ${video.id}: views ${video.views} → ${video.views + 40}, likes ${video.likes} → ${video.likes + 8}`)
    }

    console.log(`✅ Successfully added 40 views and 8 likes to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addViewsLikesLowEngagement()
