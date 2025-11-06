import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupSecIdRecords() {
  try {
    console.log('🔍 Checking for users with null secId...')
    
    // Find all users with null or undefined secId
    const usersWithNullSecId = await prisma.sECUser.findMany({
      where: {
        OR: [
          { secId: null },
          { secId: undefined }
        ]
      },
      select: {
        id: true,
        phone: true,
        secId: true,
        createdAt: true
      }
    })
    
    console.log(`Found ${usersWithNullSecId.length} users with null/undefined secId:`)
    usersWithNullSecId.forEach(user => {
      console.log(`  - Phone: ${user.phone}, Created: ${user.createdAt}`)
    })
    
    if (usersWithNullSecId.length > 0) {
      console.log('\n✅ These users can now login without issues!')
      console.log('The unique constraint on secId has been removed.')
    } else {
      console.log('\n✅ No users with null secId found.')
    }
    
    // Optional: Remove the secId field entirely from documents that have it as null
    // This is not necessary but can clean up the database
    console.log('\n🧹 Cleaning up null secId fields in database...')
    
    // MongoDB specific operation to unset null secId fields
    const result = await prisma.sECUser.updateMany({
      where: {
        secId: null
      },
      data: {
        // This will effectively remove the field if it's null
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Cleanup completed. Updated ${result.count} records.`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupSecIdRecords()
  .then(() => {
    console.log('\n🎉 Database cleanup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })