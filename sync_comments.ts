import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncCommentCounts() {
  const videos = await prisma.pitchSultanVideo.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          comments: true
        }
      }
    }
  })

  console.log('Syncing comment counts...')
  
  for (const video of videos) {
    const actualCount = video._count.comments
    await prisma.pitchSultanVideo.update({
      where: { id: video.id },
      data: { commentsCount: actualCount }
    })
    console.log(`✅ ${video.title || 'Untitled'}: Updated to ${actualCount} comments`)
  }

  console.log('\n✅ All comment counts synced!')
  await prisma.$disconnect()
}

syncCommentCounts()
