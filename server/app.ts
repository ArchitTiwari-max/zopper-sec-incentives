import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// API Routes

/**
 * GET /api/stores
 * Fetch all stores from database
 */
app.get('/api/stores', async (req, res) => {
  try {
    console.log('📍 Fetching all stores...')
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        storeName: true,
        city: true
      },
      orderBy: {
        storeName: 'asc'
      }
    })
    
    console.log(`✅ Found ${stores.length} stores`)
    res.json({
      success: true,
      data: stores,
      count: stores.length
    })
  } catch (error) {
    console.error('❌ Error fetching stores:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/samsung-skus
 * Fetch all Samsung SKUs with their categories and model names
 */
app.get('/api/samsung-skus', async (req, res) => {
  try {
    console.log('📱 Fetching Samsung SKUs...')
    const samsungSKUs = await prisma.samsungSKU.findMany({
      select: {
        id: true,
        Category: true,
        ModelName: true
      },
      orderBy: [
        { Category: 'asc' },
        { ModelName: 'asc' }
      ]
    })
    
    console.log(`✅ Found ${samsungSKUs.length} Samsung SKUs`)
    res.json({
      success: true,
      data: samsungSKUs,
      count: samsungSKUs.length
    })
  } catch (error) {
    console.error('❌ Error fetching Samsung SKUs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Samsung SKUs',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/samsung-skus/:id/plans
 * Fetch all plans for a specific Samsung SKU
 */
app.get('/api/samsung-skus/:id/plans', async (req, res) => {
  try {
    const { id } = req.params
    console.log(`📋 Fetching plans for Samsung SKU: ${id}`)
    
    const plans = await prisma.plan.findMany({
      where: {
        samsungSKUId: id
      },
      select: {
        id: true,
        planType: true,
        price: true
      },
      orderBy: {
        planType: 'asc'
      }
    })
    
    console.log(`✅ Found ${plans.length} plans for SKU ${id}`)
    res.json({
      success: true,
      data: plans,
      count: plans.length
    })
  } catch (error) {
    console.error('❌ Error fetching plans:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/plans
 * Fetch all available plan types with their prices
 */
app.get('/api/plans', async (req, res) => {
  try {
    console.log('📋 Fetching all plans...')
    const plans = await prisma.plan.findMany({
      select: {
        id: true,
        planType: true,
        price: true,
        samsungSKU: {
          select: {
            id: true,
            Category: true,
            ModelName: true
          }
        }
      },
      orderBy: [
        { samsungSKU: { Category: 'asc' } },
        { samsungSKU: { ModelName: 'asc' } },
        { planType: 'asc' }
      ]
    })
    
    console.log(`✅ Found ${plans.length} total plans`)
    res.json({
      success: true,
      data: plans,
      count: plans.length
    })
  } catch (error) {
    console.error('❌ Error fetching plans:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/plan-price
 * Get plan price for specific SKU and plan type
 */
app.get('/api/plan-price', async (req, res) => {
  try {
    const { skuId, planType } = req.query
    
    if (!skuId || !planType) {
      return res.status(400).json({
        success: false,
        message: 'SKU ID and plan type are required'
      })
    }
    
    console.log(`💰 Fetching price for SKU: ${skuId}, Plan: ${planType}`)
    
    const plan = await prisma.plan.findFirst({
      where: {
        samsungSKUId: skuId as string,
        planType: planType as any
      },
      select: {
        id: true,
        planType: true,
        price: true,
        samsungSKU: {
          select: {
            Category: true,
            ModelName: true
          }
        }
      }
    })
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found for the specified SKU and plan type'
      })
    }
    
    console.log(`✅ Found plan price: ₹${plan.price}`)
    res.json({
      success: true,
      data: plan
    })
  } catch (error) {
    console.error('❌ Error fetching plan price:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan price',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API server is running',
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
  console.log(`📍 Available endpoints:`)
  console.log(`   GET /api/health - Health check`)
  console.log(`   GET /api/stores - Fetch all stores`)
  console.log(`   GET /api/samsung-skus - Fetch all Samsung SKUs`)
  console.log(`   GET /api/samsung-skus/:id/plans - Fetch plans for specific SKU`)
  console.log(`   GET /api/plans - Fetch all plans`)
  console.log(`   GET /api/plan-price?skuId=:id&planType=:type - Get specific plan price`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})