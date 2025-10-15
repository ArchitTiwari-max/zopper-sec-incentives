import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generates a new store ID in the format store_000001
 * This function finds the highest existing store ID number and increments it
 * @returns Promise<string> - The generated store ID
 */
export async function generateStoreId(): Promise<string> {
  try {
    // Get all stores and extract the numeric part of their IDs
    const stores = await prisma.store.findMany({
      select: { id: true },
      orderBy: { id: 'desc' }
    })

    let maxNumber = 0

    // Find the highest number from existing store IDs
    for (const store of stores) {
      if (store.id.startsWith('store_')) {
        const numberPart = store.id.substring(6) // Remove "store_" prefix
        const num = parseInt(numberPart, 10)
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num
        }
      }
    }

    // Increment and format with leading zeros
    const nextNumber = maxNumber + 1
    const formattedNumber = nextNumber.toString().padStart(6, '0')
    
    return `store_${formattedNumber}`
  } catch (error) {
    console.error('Error generating store ID:', error)
    throw new Error('Failed to generate store ID')
  }
}

/**
 * Creates a new store with auto-generated ID
 * @param storeData - Object containing storeName and city
 * @returns Promise<Store> - The created store
 */
export async function createStore(storeData: { storeName: string; city: string }) {
  const storeId = await generateStoreId()
  
  return await prisma.store.create({
    data: {
      id: storeId,
      storeName: storeData.storeName,
      city: storeData.city
    }
  })
}