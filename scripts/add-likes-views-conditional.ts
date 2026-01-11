import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addLikesAndViewsConditional() {
  try {
    console.log('Starting to add likes and views to videos with low engagement...')

    // Get videos with likes < 10 AND views < 200
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        AND: [
          { likes: { lt: 10 } },
          { views: { lt: 200 } }
        ]
      },
      select: { id: true, likes: true, views: true }
    })

    console.log(`Found ${videos.length} videos with likes < 10 and views < 200`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          likes: {
            increment: 10
          },
          views: {
            increment: 50
          }
        }
      })
      console.log(`Updated video ${video.id}: likes ${video.likes} → ${video.likes + 10}, views ${video.views} → ${video.views + 50}`)
    }

    console.log(`✅ Successfully added 10 likes and 50 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addLikesAndViewsConditional()
