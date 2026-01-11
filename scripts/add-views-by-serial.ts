 1005import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addViewsBySerial() {
  try {
    console.log('Starting to add 80 views to videos with specific serial numbers...')

    const serialNumbers = [1013, 1012, 1011, 1010, 1009, 1014, 1008, 1007]

    // Get videos with these serial numbers
    const videos = await prisma.pitchSultanVideo.findMany({
      where: {
        serialNumber: {
          in: serialNumbers
        }
      },
      select: { id: true, serialNumber: true, views: true }
    })

    console.log(`Found ${videos.length} videos with serial numbers: ${serialNumbers.join(', ')}`)

    // Update each video
    for (const video of videos) {
      await prisma.pitchSultanVideo.update({
        where: { id: video.id },
        data: {
          views: {
            increment: 80
          }
        }
      })
      console.log(`Updated serial ${video.serialNumber}: views ${video.views} → ${video.views + 80}`)
    }

    console.log(`✅ Successfully added 80 views to ${videos.length} videos`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addViewsBySerial()
