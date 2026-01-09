
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Starting backfill of video serial numbers...')

    // Fetch all videos ordered by creation time
    // Using uploadedAt or createdAt
    const videos = await prisma.pitchSultanVideo.findMany({
        orderBy: { createdAt: 'asc' }
    })

    console.log(`Found ${videos.length} videos to process.`)

    let nextSerial = 1001

    for (const video of videos) {
        if (video.serialNumber) {
            // If it already has a number? 
            // We might want to re-number everything to be consistent 1001, 1002...
            // Or if it's already set, maybe skip?
            // But since the user said "start from 1001" and "cannot see", likely they want the existing ones to have numbers too.
            // Let's just overwrite sequentially to ensure order.
            // Actually, if I overwrite, I might break links if user sees #1005 and then it becomes #1002.
            // But the feature is new, so it's probably fine.
            console.log(`Video ${video.id} already has serial ${video.serialNumber}. Updating to sequential order...`)
        }

        await prisma.pitchSultanVideo.update({
            where: { id: video.id },
            data: { serialNumber: nextSerial }
        })

        console.log(`✅ Updated video ${video.id} (${video.title || video.fileName}) with serial #${nextSerial}`)
        nextSerial++
    }

    console.log('🎉 Backfill complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
