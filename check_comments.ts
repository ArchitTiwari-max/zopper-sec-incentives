import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkComments() {
  const videos = await prisma.pitchSultanVideo.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      commentsCount: true,
      _count: {
        select: {
          comments: true
        }
      }
    }
  })

  console.log('Videos with comment data:')
  videos.forEach(v => {
    console.log(`- ${v.title || 'Untitled'}: commentsCount=${v.commentsCount}, actual comments=${v._count.comments}`)
  })

  await prisma.$disconnect()
}

checkComments()
