import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addViewsExcludeSerial() {
  try {
    console.log('Starting to add 50 views to all videos except serial numbers 1001-1005...')

    const excludeSerialNumbers = [1001, 1002, 1003, 1004, 1005]

    // Get all videos except those with excluded serial numbers
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        serialNumber: {
          notIn: excludeSerialNumbers
        }
      },
      select: { id: true, serialNumber: true, views: true }
    })

    console.log(`Found ${videos.length} videos (excluding serial numbers: ${excludeSerialNumbers.join(', ')})`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          views: {
            increment: 53
          }
        }
      })
      console.log(`Updated serial ${video.serialNumber}: views ${video.views} → ${video.views + 50}`)
    }

    console.log(`✅ Successfully added 50 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addViewsExcludeSerial()
