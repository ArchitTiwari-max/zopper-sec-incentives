import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addViewsToAll() {
  try {
    console.log('Starting to add 22 views to all videos...')

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
          views: {
            increment: 22
          }
        }
      })
    }

    console.log(`✅ Successfully added 22 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addViewsToAll()
