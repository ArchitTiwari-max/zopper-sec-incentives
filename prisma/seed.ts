import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create initial admin user
  const hashedPassword = await bcrypt.hash('sysad@12', 10)
  
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'system_admin',
      password: hashedPassword,
      name: 'System Administrator',
      email: 'vishal.shukla@zopper.com',
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', { 
    id: admin.id, 
    username: admin.username, 
    name: admin.name 
  })


  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })