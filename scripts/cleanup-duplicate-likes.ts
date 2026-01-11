import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateLikes() {
    console.log('🔍 Finding duplicate likes...')

    try {
        // Get all likes
        const allLikes = await prisma.userVideoLike.findMany({
            orderBy: { createdAt: 'asc' }
        })

        console.log(`📊 Total likes found: ${allLikes.length}`)

        // Group by videoId + userId to find duplicates
        const likeMap = new Map<string, any>()
        const duplicatesToDelete: string[] = []

        for (const like of allLikes) {
            const key = `${like.videoId}_${like.userId}`

            if (likeMap.has(key)) {
                // This is a duplicate - mark for deletion
                duplicatesToDelete.push(like.id)
                console.log(`🔄 Found duplicate: videoId=${like.videoId}, userId=${like.userId}`)
            } else {
                // First occurrence - keep it
                likeMap.set(key, like)
            }
        }

        console.log(`\n📋 Summary:`)
        console.log(`   Unique likes: ${likeMap.size}`)
        console.log(`   Duplicates to remove: ${duplicatesToDelete.length}`)

        if (duplicatesToDelete.length > 0) {
            console.log('\n🗑️  Deleting duplicates...')

            const deleteResult = await prisma.userVideoLike.deleteMany({
                where: {
                    id: {
                        in: duplicatesToDelete
                    }
                }
            })

            console.log(`✅ Deleted ${deleteResult.count} duplicate likes`)
        } else {
            console.log('✅ No duplicates found!')
        }

    } catch (error) {
        console.error('❌ Error cleaning up duplicates:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

cleanupDuplicateLikes()
    .then(() => {
        console.log('\n✅ Cleanup complete! You can now run: npx prisma db push')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Cleanup failed:', error)
        process.exit(1)
    })
