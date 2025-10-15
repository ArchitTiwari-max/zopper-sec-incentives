import XLSX from 'xlsx'
import { PrismaClient, PlanType } from '@prisma/client'

const prisma = new PrismaClient()

interface SamsungExcelData {
  Category: string
  Model_Name: string
  'Screen Protect ( 1 Yr)': number
  'ADLD ( 1 Yr )': number
  'Combo ( 2Yrs )': number
  'Extended Warranty ( 1 Yr )': number
}

// Map Excel column names to enum values
const planTypeMapping: Record<string, PlanType> = {
  'Screen Protect ( 1 Yr)': PlanType.Screen_Protect_1_Yr,
  'ADLD ( 1 Yr )': PlanType.ADLD_1_Yr,
  'Combo ( 2Yrs )': PlanType.Combo_2Yrs,
  'Extended Warranty ( 1 Yr )': PlanType.Extended_Warranty_1_Yr
}

/**
 * Import Samsung SKU and Plan data from Excel file to MongoDB database
 * @param filePath - Path to the Excel file
 */
async function importSamsungDataFromExcel(filePath: string) {
  console.log('🚀 Starting Samsung data import process...')
  console.log(`📖 Reading Excel file: ${filePath}`)

  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Get first sheet
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert worksheet to JSON
    const data: SamsungExcelData[] = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`📊 Found ${data.length} Samsung SKU records in Excel file`)

    if (data.length === 0) {
      console.log('⚠️  No data found in Excel file')
      return
    }

    // Log first row to verify column mapping
    console.log('🔍 Sample data structure:', data[0])
    console.log('⏳ Processing Samsung SKUs and Plans...\n')

    let successCount = 0
    let updateCount = 0
    let errorCount = 0
    let totalPlansCreated = 0
    const errors: string[] = []

    // Process each Samsung SKU
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i]
      const rowNumber = i + 2 // Excel row number (accounting for header)
      
      try {
        // Validate required fields
        if (!rowData.Category || !rowData.Model_Name) {
          throw new Error(`Missing required fields (Category: ${rowData.Category}, Model_Name: ${rowData.Model_Name})`)
        }

        // Clean and validate data
        const cleanCategory = String(rowData.Category).trim()
        const cleanModelName = String(rowData.Model_Name).trim()

        if (!cleanCategory || !cleanModelName) {
          throw new Error('Empty values after cleaning data')
        }

        // Check if Samsung SKU already exists
        let samsungSKU = await prisma.samsungSKU.findFirst({
          where: { 
            Category: cleanCategory,
            ModelName: cleanModelName
          },
          include: { plans: true }
        })

        let isUpdate = false
        
        if (samsungSKU) {
          // Update existing SKU
          samsungSKU = await prisma.samsungSKU.update({
            where: { id: samsungSKU.id },
            data: {
              Category: cleanCategory,
              ModelName: cleanModelName
            },
            include: { plans: true }
          })
          isUpdate = true
        } else {
          // Create new SKU
          samsungSKU = await prisma.samsungSKU.create({
            data: {
              Category: cleanCategory,
              ModelName: cleanModelName
            },
            include: { plans: true }
          })
        }

        // Delete existing plans if updating
        if (isUpdate && samsungSKU.plans.length > 0) {
          await prisma.plan.deleteMany({
            where: { samsungSKUId: samsungSKU.id }
          })
        }

        // Create plans for this SKU
        const plansToCreate = []
        
        for (const [excelColumnName, planType] of Object.entries(planTypeMapping)) {
          const price = rowData[excelColumnName as keyof SamsungExcelData]
          
          if (price && typeof price === 'number' && price > 0) {
            plansToCreate.push({
              planType: planType,
              price: price,
              samsungSKUId: samsungSKU.id
            })
          }
        }

        // Create all plans for this SKU
        if (plansToCreate.length > 0) {
          await prisma.plan.createMany({
            data: plansToCreate
          })
          totalPlansCreated += plansToCreate.length
        }

        if (isUpdate) {
          updateCount++
          console.log(`🔄 Updated Samsung SKU: ${cleanCategory} - ${cleanModelName} (${plansToCreate.length} plans)`)
        } else {
          successCount++
          console.log(`✅ Created Samsung SKU: ${cleanCategory} - ${cleanModelName} (${plansToCreate.length} plans)`)
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
    console.log('📈 SAMSUNG DATA IMPORT SUMMARY')
    console.log('='.repeat(50))
    console.log(`📊 Total SKUs processed: ${data.length}`)
    console.log(`✅ Successfully created: ${successCount}`)
    console.log(`🔄 Successfully updated: ${updateCount}`)
    console.log(`📋 Total plans created: ${totalPlansCreated}`)
    console.log(`❌ Errors encountered: ${errorCount}`)
    console.log(`🎯 Success rate: ${((successCount + updateCount) / data.length * 100).toFixed(2)}%`)
    
    if (errors.length > 0) {
      console.log('\n🔍 ERROR DETAILS:')
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

    if (errorCount === 0) {
      console.log('\n🎉 All Samsung SKUs and Plans processed successfully!')
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
 */
async function main() {
  console.log('📱 SAMSUNG SKU & PLAN IMPORT UTILITY')
  console.log('='.repeat(50))
  
  // 📝 UPDATE THIS PATH TO YOUR EXCEL FILE
  const filePath = 'C:/Users/visha/Desktop/Samsung SKU with Plan Price.xlsx'  // Change this to your Excel file path
  
  console.log(`📁 Using file path: ${filePath}`)
  
  // Check if file exists
  try {
    const fs = await import('fs')
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`)
      console.log('💡 Please update the filePath variable in the script with the correct path')
      console.log('💡 Example: const filePath = "C:/Users/yourname/Desktop/samsungData.xlsx"')
      process.exit(1)
    }
    console.log(`✅ File found: ${filePath}`)
  } catch (error) {
    console.log('❌ Error checking file:', error)
    process.exit(1)
  }

  await importSamsungDataFromExcel(filePath)
}

// Run the script
main().catch((error) => {
  console.log('💥 Unexpected error occurred:')
  console.error('❌', error)
  process.exit(1)
})

export { importSamsungDataFromExcel }