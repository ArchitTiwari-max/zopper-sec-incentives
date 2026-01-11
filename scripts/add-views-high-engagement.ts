import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addViewsHighEngagement() {
  try {
    console.log('Starting to add views to high engagement videos...')

    // Get videos with views > 200 AND likes > 30
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        AND: [
          { views: { gt: 200 } },
          { likes: { gt: 30 } }
        ]
      },
      select: { id: true, likes: true, views: true }
    })

    console.log(`Found ${videos.length} videos with views > 200 and likes > 30`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          views: {
            increment: 70
          }
        }
      })
      console.log(`Updated video ${video.id}: views ${video.views} → ${video.views + 70}`)
    }

    console.log(`✅ Successfully added 70 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addViewsHighEngagement()
