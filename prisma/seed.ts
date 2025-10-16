import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create initial admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'System Administrator',
      email: 'admin@zopperincentives.com',
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', { 
    id: admin.id, 
    username: admin.username, 
    name: admin.name 
  })

  // Create some sample stores
  const stores = await Promise.all([
    prisma.store.upsert({
      where: { id: 'STORE001' },
      update: {},
      create: {
        id: 'STORE001',
        storeName: 'Samsung Store Mumbai',
        city: 'Mumbai',
      },
    }),
    prisma.store.upsert({
      where: { id: 'STORE002' },
      update: {},
      create: {
        id: 'STORE002',
        storeName: 'Samsung Store Delhi',
        city: 'Delhi',
      },
    }),
    prisma.store.upsert({
      where: { id: 'STORE003' },
      update: {},
      create: {
        id: 'STORE003',
        storeName: 'Samsung Store Bangalore',
        city: 'Bangalore',
      },
    }),
  ])

  console.log('✅ Created stores:', stores.map(s => s.storeName))

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