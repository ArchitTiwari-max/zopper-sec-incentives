
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Checking for videos without serial numbers...')

    // 1. Find the highest current serial number
    const lastVideoWithSerial = await prisma.pitchSultanVideo.findFirst({
        where: { serialNumber: { not: null } },
        orderBy: { serialNumber: 'desc' }
    })

    let nextSerial = (lastVideoWithSerial?.serialNumber || 1000) + 1
    console.log(`ℹ️ Current highest serial is ${lastVideoWithSerial?.serialNumber || 'None'}. Next will be ${nextSerial}.`)

    // 2. Find all videos WITHOUT a serial number
    // MongoDB filter for null might need explicit check or "isSet: false" conceptually, 
    // but Prisma { serialNumber: null } or { serialNumber: { isSet: false } } depends on how schema is mapped.
    // In Prisma with MongoDB, optional Int can be null.

    const videosToUpdate = await prisma.pitchSultanVideo.findMany({
        where: {
            OR: [
                { serialNumber: null },
                { serialNumber: { isSet: false } }
            ]
        },
        orderBy: { createdAt: 'asc' }
    })

    console.log(`found ${videosToUpdate.length} videos needing serial numbers.`)

    if (videosToUpdate.length === 0) {
        console.log('✅ All videos already have serial numbers.')
        return
    }

    // 3. Update them sequentially
    for (const video of videosToUpdate) {
        await prisma.pitchSultanVideo.update({
            where: { id: video.id },
            data: { serialNumber: nextSerial }
        })

        console.log(`✅ Assigned #${nextSerial} to video: "${video.title || video.fileName}"`)
        nextSerial++
    }

    console.log('🎉 Repair complete! All videos now have serial numbers.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
