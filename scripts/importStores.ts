import XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const prisma = new PrismaClient()

interface StoreData {
  Store_ID: string
  City: string
  'Store Name': string
}

/**
 * Import stores from Excel file to MongoDB database with upsert functionality
 * @param filePath - Path to the Excel file
 */
async function importStoresFromExcel(filePath: string) {
  console.log('🚀 Starting store import process...')
  console.log(`📖 Reading Excel file: ${filePath}`)

  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Get first sheet
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert worksheet to JSON
    const data: StoreData[] = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`📊 Found ${data.length} stores in Excel file`)

    if (data.length === 0) {
      console.log('⚠️  No data found in Excel file')
      return
    }

    // Log first row to verify column mapping
    console.log('🔍 Sample data structure:', data[0])
    console.log('⏳ Processing stores...\n')

    let successCount = 0
    let updateCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each store
    for (let i = 0; i < data.length; i++) {
      const storeData = data[i]
      const rowNumber = i + 2 // Excel row number (accounting for header)
      
      try {
        // Validate required fields
        if (!storeData.Store_ID || !storeData.City || !storeData['Store Name']) {
          throw new Error(`Missing required fields (Store_ID: ${storeData.Store_ID}, City: ${storeData.City}, Store Name: ${storeData['Store Name']})`)
        }

        // Clean and validate data
        const cleanStoreId = String(storeData.Store_ID).trim()
        const cleanStoreName = String(storeData['Store Name']).trim()
        const cleanCity = String(storeData.City).trim()

        if (!cleanStoreId || !cleanStoreName || !cleanCity) {
          throw new Error('Empty values after cleaning data')
        }

        // Use upsert to create or update store
        const result = await prisma.store.upsert({
          where: { 
            id: cleanStoreId 
          },
          update: {
            storeName: cleanStoreName,
            city: cleanCity
          },
          create: {
            id: cleanStoreId,
            storeName: cleanStoreName,
            city: cleanCity
          }
        })

        // Check if it was an update or create
        const existingStore = await prisma.store.findUnique({
          where: { id: cleanStoreId }
        })

        if (existingStore && (existingStore.storeName !== cleanStoreName || existingStore.city !== cleanCity)) {
          updateCount++
          console.log(`🔄 Updated store: ${cleanStoreId} - ${cleanStoreName} (${cleanCity})`)
        } else {
          successCount++
          console.log(`✅ Created store: ${cleanStoreId} - ${cleanStoreName} (${cleanCity})`)
        }

      } catch (error) {
        errorCount++
        const errorMsg = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.log(`❌ Error in row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // Continue processing next record
        continue
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(50))
    console.log('📈 IMPORT SUMMARY')
    console.log('='.repeat(50))
    console.log(`📊 Total stores processed: ${data.length}`)
    console.log(`✅ Successfully created: ${successCount}`)
    console.log(`🔄 Successfully updated: ${updateCount}`)
    console.log(`❌ Errors encountered: ${errorCount}`)
    console.log(`🎯 Success rate: ${((successCount + updateCount) / data.length * 100).toFixed(2)}%`)
    
    if (errors.length > 0) {
      console.log('\n🔍 ERROR DETAILS:')
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

    if (errorCount === 0) {
      console.log('\n🎉 All stores processed successfully!')
    } else {
      console.log(`\n⚠️  Completed with ${errorCount} errors. Check details above.`)
    }

  } catch (error) {
    console.log('💥 Failed to read Excel file or connect to database:')
    console.error('❌', error instanceof Error ? error.message : 'Unknown error')
  } finally {
    console.log('🔌 Disconnecting from database...')
    await prisma.$disconnect()
    console.log('✅ Database connection closed')
  }
}

/**
 * Main function to run the import
 * Update the filePath variable below with your Excel file path
 */
async function main() {
  console.log('🏪 STORE IMPORT UTILITY')
  console.log('='.repeat(50))
  
  // 📝 UPDATE THIS PATH TO YOUR EXCEL FILE
  const filePath = 'C:/Users/visha/Desktop/storesIncentive.xlsx'  // Change this to your Excel file path
  
  console.log(`📁 Using file path: ${filePath}`)
  
  // Check if file exists
  try {
    const fs = await import('fs')
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`)
      console.log('💡 Please update the filePath variable in the script with the correct path')
      console.log('💡 Example: const filePath = "C:\\\\Users\\\\yourname\\\\Desktop\\\\stores.xlsx"')
      process.exit(1)
    }
    console.log(`✅ File found: ${filePath}`)
  } catch (error) {
    console.log('❌ Error checking file:', error)
    process.exit(1)
  }

  await importStoresFromExcel(filePath)
}

// Run the script
main().catch((error) => {
  console.log('💥 Unexpected error occurred:')
  console.error('❌', error)
  process.exit(1)
})

export { importStoresFromExcel }