import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import { utils, read } from 'xlsx'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET

// Check if JWT_SECRET is properly configured
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!')
  process.exit(1)
}

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files are allowed!'))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Middleware
app.use(cors({ credentials: true, origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }))
app.use(express.json())
app.use(cookieParser())

// Helper functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Ensure required Samsung SKUs exist (runs at startup)
async function ensureEssentialSKUs() {
  const requiredSKUs = [
    { Category: 'Luxury Flip', ModelName: 'Z Flip FE' }
  ]

  for (const sku of requiredSKUs) {
    try {
      const existing = await prisma.samsungSKU.findFirst({
        where: { Category: sku.Category, ModelName: sku.ModelName }
      })

      if (!existing) {
        const created = await prisma.samsungSKU.create({ data: sku })
        // Removed startup console log
      } else {
        // Removed startup console log
      }
    } catch (e) {
      console.error('❌ Failed ensuring Samsung SKU', sku, e)
    }
  }
}

// Comify WhatsApp API integration
async function sendOTPViaWhatsApp(phone: string, otp: string) {
  try {
    const comifyApiKey = process.env.COMIFY_API_KEY || '4hp75ThOEyWdJAWQ4cNmD4GpSBHrBh'
    const baseUrl = process.env.COMIFY_BASE_URL || 'https://commify.transify.tech/v1'
    const templateName = process.env.COMIFY_TEMPLATE_NAME || 'zopper_oem_sec_verify'
    
    // Format phone number - ensure it starts with 91
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`
    
    console.log(`📱 Sending OTP ${otp} to WhatsApp number: ${formattedPhone}`)
    
    const response = await fetch(`${baseUrl}/comm`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${comifyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: templateName,
        payload: {
          phone: formattedPhone,
          otp: parseInt(otp)
        },
        type: 'whatsappTemplate'
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Comify API error:', result)
      throw new Error(`Comify API error: ${result.message || result.error || 'Unknown error'}`)
    }

    console.log(`✅ WhatsApp OTP sent successfully via Comify to ${formattedPhone}`)
    return { success: true, message: 'OTP sent successfully', data: result }
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp OTP via Comify:', error)
    throw error
  }
}

// Authentication APIs

/**
 * POST /api/auth/send-otp
 * Send OTP to SEC's WhatsApp number
 */
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number is required'
      })
    }

    // Check for rate limiting - prevent multiple OTP requests within 1 minute
    const recentOTP = await prisma.oTPSession.findFirst({
      where: {
        phone,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000) // 1 minute ago
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting another OTP'
      })
    }

    // Delete all previous OTP records for this phone number
    await prisma.oTPSession.deleteMany({
      where: {
        phone
      }
    })

    console.log(`🗑️ Deleted all previous OTP records for ${phone}`)

    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create new OTP session
    const otpSession = await prisma.oTPSession.create({
      data: {
        phone,
        otp,
        expiresAt,
      },
    })

    // Send OTP via WhatsApp
    await sendOTPViaWhatsApp(phone, otp)

    console.log(`✅ New OTP sent to ${phone}, Session ID: ${otpSession.id}`)
    res.json({
      success: true,
      message: 'OTP sent to your WhatsApp number',
    })
  } catch (error) {
    console.error('❌ Error sending OTP:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login SEC user
 */
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      })
    }

    // Find valid OTP session
    const otpSession = await prisma.oTPSession.findFirst({
      where: {
        phone,
        otp,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!otpSession) {
      // Check if OTP exists but is expired or used for better error message
      const anyOTP = await prisma.oTPSession.findFirst({
        where: { phone, otp },
        orderBy: { createdAt: 'desc' }
      })
      
      if (anyOTP) {
        if (anyOTP.isUsed) {
          console.log(`❌ OTP already used for ${phone}: ${otp}`)
          return res.status(400).json({
            success: false,
            message: 'This OTP has already been used'
          })
        } else if (anyOTP.expiresAt < new Date()) {
          console.log(`❌ OTP expired for ${phone}: ${otp}, expired at ${anyOTP.expiresAt}`)
          return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new one.'
          })
        }
      }
      
      console.log(`❌ Invalid OTP for ${phone}: ${otp}`)
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      })
    }

    console.log(`✅ Valid OTP found for ${phone}, Session ID: ${otpSession.id}`)

    // Mark OTP as used
    await prisma.oTPSession.update({
      where: { id: otpSession.id },
      data: { isUsed: true }
    })

    // Find or create SEC user using upsert to avoid race conditions
    let secUser
    try {
      // First try to find existing user
      secUser = await prisma.sECUser.findUnique({
        where: { phone },
        include: { store: true }
      })
      
      if (secUser) {
        // Update existing user
        secUser = await prisma.sECUser.update({
          where: { phone },
          data: { lastLoginAt: new Date() },
          include: { store: true }
        })
        console.log(`✅ Existing SEC user found and updated for phone: ${phone}`)
      } else {
        // Create new user - don't set secId at all to avoid unique constraint issues
        secUser = await prisma.sECUser.create({
          data: {
            phone,
            lastLoginAt: new Date()
            // Do not include secId field at all - let it be undefined rather than null
          },
          include: { store: true }
        })
        console.log(`✅ New SEC user created for phone: ${phone}`)
      }
    } catch (dbError) {
      console.error(`❌ Failed to find/create SEC user for ${phone}:`, dbError)
      throw dbError
    }

    // Generate JWT token
    console.log(`🔐 Generating JWT for user ${secUser.id}, phone: ${phone}`)
    let token
    try {
      token = jwt.sign(
        {
          userId: secUser.id,
          role: 'sec',
          phone: secUser.phone
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
      console.log(`✅ JWT token generated successfully for ${phone}`)
    } catch (jwtError) {
      console.error(`❌ JWT signing failed for ${phone}:`, jwtError)
      return res.status(500).json({
        success: false,
        message: 'Failed to generate authentication token'
      })
    }

    console.log(`✅ SEC with phone ${secUser.phone} logged in successfully`)
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        secId: secUser.secId, // Can be null
        phone: secUser.phone,
        name: secUser.name,   // Can be null
        storeId: secUser.storeId,
        store: secUser.store
      }
    })
  } catch (error) {
    console.error('❌ Error verifying OTP:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/auth/admin-login
 * Admin login with username and password
 */
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      })
    }

    // Find admin user
    const admin = await prisma.adminUser.findUnique({
      where: { username }
    })

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: admin.id,
        role: 'admin',
        username: admin.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.log(`✅ Admin ${admin.username} logged in successfully`)
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email
      }
    })
  } catch (error) {
    console.error('❌ Error in admin login:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (optional endpoint for cleanup)
 */
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

/**
 * PUT /api/auth/update-profile
 * Update SEC user profile (secId and name)
 */
app.put('/api/auth/update-profile', async (req, res) => {
  try {
    const { secId, name } = req.body
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can update profile'
      })
    }

    if (!secId || !secId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SEC ID is required'
      })
    }

    // Check if SEC ID is already taken by another user (only if secId is provided)
    if (secId && secId.trim()) {
      const existingUser = await prisma.sECUser.findFirst({
        where: {
          secId: secId.trim(),
          id: { not: decoded.userId } // Exclude current user
        }
      })

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This SEC ID is already taken by another user'
        })
      }
    }

    // Update user profile
    const updatedUser = await prisma.sECUser.update({
      where: { id: decoded.userId },
      data: {
        secId: secId.trim(),
        name: name?.trim() || null
      },
      include: { store: true }
    })

    console.log(`✅ SEC profile updated: ${updatedUser.secId}`)
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        secId: updatedUser.secId,
        phone: updatedUser.phone,
        name: updatedUser.name,
        storeId: updatedUser.storeId,
        store: updatedUser.store
      }
    })
  } catch (error) {
    console.error('❌ Error updating profile:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Helper function to calculate incentive with fixed rates
function calculateIncentive(planType: string): number {
  const incentiveRates = {
    'ADLD_1_Yr': 100,                // Fixed ₹100
    'Combo_2Yrs': 300,               // Fixed ₹300
    'Extended_Warranty_1_Yr': 0,     // No incentive
    'Screen_Protect_1_Yr': 0,        // No incentive
    'Test_Plan': 1                   // Test plan ₹1 incentive
  }
  
  return incentiveRates[planType as keyof typeof incentiveRates] || 0
}

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

    // Fetch existing plans for this SKU
    const existingPlans = await prisma.plan.findMany({
      where: { samsungSKUId: id },
      select: { id: true, planType: true, price: true },
      orderBy: { planType: 'asc' }
    })

    // Ensure all standard plan types exist for this SKU (create missing with price ₹0)
    const requiredPlanTypes = [
      'Screen_Protect_1_Yr',
      'ADLD_1_Yr',
      'Combo_2Yrs',
      'Extended_Warranty_1_Yr'
    ] as const

    const existingTypes = new Set(existingPlans.map(p => p.planType))
    const missingTypes = requiredPlanTypes.filter(t => !existingTypes.has(t as any))

    if (missingTypes.length > 0) {
      await prisma.plan.createMany({
        data: missingTypes.map(t => ({
          planType: t as any,
          price: 0,
          samsungSKUId: id
        }))
      })
      console.log(`🆕 Added ${missingTypes.length} missing plan(s) for SKU ${id}: ${missingTypes.join(', ')}`)
    }

    // Fetch updated list after ensuring completeness
    const plans = await prisma.plan.findMany({
      where: { samsungSKUId: id },
      select: { id: true, planType: true, price: true },
      orderBy: { planType: 'asc' }
    })

    // Ensure a global Test_Plan exists (no SKU) and include it in returned list
    let testPlan = await prisma.plan.findFirst({
      where: { planType: 'Test_Plan', samsungSKUId: null },
      select: { id: true, planType: true, price: true }
    })
    if (!testPlan) {
      testPlan = await prisma.plan.create({
        data: { planType: 'Test_Plan' as any, price: 0 },
        select: { id: true, planType: true, price: true }
      })
      console.log('🆕 Created global Test_Plan with price ₹0')
    }

    const result = [...plans, testPlan]

    console.log(`✅ Found ${result.length} plans (including Test_Plan) for SKU ${id}`)
    res.json({
      success: true,
      data: result,
      count: result.length
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


// Working submit route
app.post('/api/reports/submit', async (req, res) => {
  try {
    const { storeId, samsungSKUId, planId, imei } = req.body
    const authHeader = req.headers.authorization
    
    // Check auth
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can submit reports'
      })
    }

    // Validate required fields
    if (!storeId || !samsungSKUId || !planId || !imei) {
      return res.status(400).json({
        success: false,
        message: 'Store, device, plan, and IMEI are required'
      })
    }

    // Duplicate IMEI check
    const trimmedImei = String(imei).trim()
    const existing = await prisma.salesReport.findFirst({ where: { imei: trimmedImei } })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'IMEI already exists — duplicate entry not allowed.'
      })
    }

    // Get the plan details from database to calculate incentive
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        samsungSKU: true
      }
    })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      })
    }

    // Calculate incentive based on plan type
    const incentiveEarned = calculateIncentive(plan.planType)

    // Create sales report in database
    const salesReport = await prisma.salesReport.create({
      data: {
        secUserId: decoded.userId,
        storeId,
        samsungSKUId,
        planId,
        imei: trimmedImei,
        planPrice: plan.price,
        incentiveEarned,
        submittedAt: new Date()
      },
      include: {
        secUser: true,
        store: true,
        samsungSKU: true,
        plan: true
      }
    })
    
    console.log(`✅ Sales report saved to database! Report ID: ${salesReport.id}, SEC: ${decoded.userId}, IMEI: ${trimmedImei}, Incentive: ₹${incentiveEarned}`)
    
    res.json({
      success: true,
      message: 'Sales report submitted and saved successfully',
      data: {
        reportId: salesReport.id,
        incentiveEarned,
        planType: plan.planType,
        planPrice: plan.price,
        submittedAt: salesReport.submittedAt
      }
    })

  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'IMEI already exists — duplicate entry not allowed.' })
    }
    console.error('❌ Error submitting sales report:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit sales report',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Alias as per SEC endpoint naming
app.post('/api/sec/report', async (req, res) => {
  try {
    const { storeId, samsungSKUId, planId, imei } = req.body
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({ success: false, message: 'Only SEC users can submit reports' })
    }

    if (!storeId || !samsungSKUId || !planId || !imei) {
      return res.status(400).json({ success: false, message: 'Store, device, plan, and IMEI are required' })
    }

    const trimmedImei = String(imei).trim()
    const existing = await prisma.salesReport.findFirst({ where: { imei: trimmedImei } })
    if (existing) {
      return res.status(409).json({ success: false, message: 'IMEI already exists — duplicate entry not allowed.' })
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' })

    const incentiveEarned = calculateIncentive(plan.planType)

    const salesReport = await prisma.salesReport.create({
      data: {
        secUserId: decoded.userId,
        storeId,
        samsungSKUId,
        planId,
        imei: trimmedImei,
        planPrice: plan.price,
        incentiveEarned,
        submittedAt: new Date()
      }
    })

    return res.json({
      success: true,
      message: 'Sales report submitted and saved successfully',
      data: {
        reportId: salesReport.id,
        incentiveEarned,
        planType: plan.planType,
        planPrice: plan.price,
        submittedAt: salesReport.submittedAt
      }
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'IMEI already exists — duplicate entry not allowed.' })
    }
    console.error('❌ Error submitting SEC report (alias):', error)
    return res.status(500).json({ success: false, message: 'Failed to submit sales report' })
  }
})

// GET SEC reports endpoint  
app.get('/api/reports/sec', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can view their reports'
      })
    }

    // Fetch reports for this SEC user
    const reports = await prisma.salesReport.findMany({
      where: {
        secUserId: decoded.userId
      },
      include: {
        store: true,
        samsungSKU: true,
        plan: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    console.log(`✅ Fetched ${reports.length} reports for SEC ${decoded.userId}`)
    res.json({
      success: true,
      data: reports,
      count: reports.length
    })

  } catch (error) {
    console.error('❌ Error fetching SEC reports:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Alias as per SEC endpoint naming
app.get('/api/sec/reports', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({ success: false, message: 'Only SEC users can view their reports' })
    }

    const reports = await prisma.salesReport.findMany({
      where: { secUserId: decoded.userId },
      include: { store: true, samsungSKU: true, plan: true },
      orderBy: { submittedAt: 'desc' }
    })

    return res.json({ success: true, data: reports, count: reports.length })
  } catch (error) {
    console.error('❌ Error fetching SEC reports (alias):', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch reports' })
  }
})

// GET all reports for admin
app.get('/api/reports/admin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can view all reports'
      })
    }

    // Fetch all sales reports with related data
    const reports = await prisma.salesReport.findMany({
      include: {
        secUser: true,
        store: true,
        samsungSKU: true,
        plan: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    console.log(`✅ Admin fetched ${reports.length} total reports`)
    res.json({
      success: true,
      data: reports,
      count: reports.length
    })

  } catch (error) {
    console.error('❌ Error fetching admin reports:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// PUT endpoint to update payment status
app.put('/api/reports/:id/payment', async (req, res) => {
  try {
    const { id } = req.params
    const { isPaid } = req.body
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can update payment status'
      })
    }

    // Update the payment status
    const updatedReport = await prisma.salesReport.update({
      where: { id },
      data: { isPaid },
      include: {
        secUser: true,
        store: true,
        samsungSKU: true,
        plan: true
      }
    })

    console.log(`✅ Admin updated payment status for report ${id}: isPaid = ${isPaid}`)
    res.json({
      success: true,
      message: `Payment status updated to ${isPaid ? 'Paid' : 'Pending'}`,
      data: updatedReport
    })

  } catch (error) {
    console.error('❌ Error updating payment status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// DELETE endpoint to discard/delete a report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can delete reports'
      })
    }

    // Delete the sales report
    const deletedReport = await prisma.salesReport.delete({
      where: { id }
    })

    console.log(`✅ Admin deleted report ${id} with IMEI: ${deletedReport.imei}`)
    res.json({
      success: true,
      message: 'Report deleted successfully'
    })

  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      })
    }
    
    console.error('❌ Error deleting report:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET SEC voucher reports endpoint (only reports with voucher codes)
app.get('/api/vouchers/sec', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can view their voucher reports'
      })
    }

    // Fetch only reports with voucher codes for this SEC user
    const voucherReports = await prisma.salesReport.findMany({
      where: {
        secUserId: decoded.userId,
        voucherCode: {
          not: null
        }
      },
      include: {
        store: true,
        samsungSKU: true,
        plan: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    console.log(`✅ Fetched ${voucherReports.length} voucher reports for SEC ${decoded.userId}`)
    res.json({
      success: true,
      data: voucherReports,
      count: voucherReports.length
    })

  } catch (error) {
    console.error('❌ Error fetching SEC voucher reports:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voucher reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Process invalid IMEI Excel file endpoint
app.post('/api/admin/process-invalid-imeis', upload.single('excel'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can process invalid IMEI files'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      })
    }

    console.log(`📊 Processing invalid IMEI Excel file: ${req.file.originalname}`)

    // Read Excel file
    const workbook = read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = utils.sheet_to_json(worksheet)

    console.log(`📋 Found ${data.length} rows in Excel file`)

    const processResults = {
      total: data.length,
      processed: 0,
      deducted: 0,
      errors: 0,
      skipped: 0,
      notificationsSent: 0,
      logs: [] as any[],
      summary: {
        deductedReports: [] as any[],
        errorReports: [] as any[],
        skippedReports: [] as any[]
      }
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i]
      processResults.processed++
      
      try {
        // Get IMEI from Excel row (try different possible column names)
        const imei = (row['IMEI'] || row['imei'] || row['Imei'] || row['IMEI Number'])?.toString()?.trim()

        // Log current row processing
        const logEntry = {
          row: i + 1,
          imei,
          action: '',
          success: false,
          message: '',
          secUser: null as any,
          deductionAmount: 0
        }

        // Validation checks
        if (!imei) {
          logEntry.action = 'SKIP'
          logEntry.message = 'Missing IMEI'
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        // Find the sales report with this IMEI
        const salesReport = await prisma.salesReport.findUnique({
          where: { imei },
          include: {
            secUser: { select: { id: true, secId: true, phone: true, name: true } },
            store: { select: { storeName: true, city: true } },
            samsungSKU: { select: { ModelName: true, Category: true } },
            plan: { select: { planType: true, price: true } }
          }
        })

        if (!salesReport) {
          logEntry.action = 'ERROR'
          logEntry.message = 'IMEI not found in any sales report'
          processResults.logs.push(logEntry)
          processResults.errors++
          processResults.summary.errorReports.push(logEntry)
          continue
        }

        // Check if deduction already exists for this IMEI
        const existingDeduction = await prisma.incentiveDeduction.findFirst({
          where: {
            imei,
            salesReportId: salesReport.id
          }
        })

        if (existingDeduction) {
          logEntry.action = 'SKIP'
          logEntry.message = 'Deduction already processed for this IMEI'
          logEntry.secUser = salesReport.secUser
          logEntry.deductionAmount = existingDeduction.deductionAmount
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        // Create deduction record
        const deductionAmount = salesReport.planPrice
        const deduction = await prisma.incentiveDeduction.create({
          data: {
            secUserId: salesReport.secUserId,
            salesReportId: salesReport.id,
            imei,
            deductionAmount,
            reason: 'Invalid IMEI for gift voucher',
            processedBy: decoded.username || decoded.userId,
            notificationSent: false
          }
        })

        // Send WhatsApp notification
        try {
          await sendOTPViaWhatsApp(
            salesReport.secUser.phone, 
            `⚠️ The IMEI ${imei} you submitted for the ${salesReport.plan.planType.replace(/_/g, ' ')} plan is invalid for a gift voucher. The plan amount of ₹${deductionAmount} has been deducted from your total incentive.`
          )
          
          // Update notification sent status
          await prisma.incentiveDeduction.update({
            where: { id: deduction.id },
            data: { notificationSent: true }
          })
          
          processResults.notificationsSent++
        } catch (notificationError) {
          console.error(`❌ Failed to send notification to ${salesReport.secUser.phone}:`, notificationError)
          // Continue processing even if notification fails
        }

        logEntry.action = 'DEDUCT'
        logEntry.success = true
        logEntry.message = `Deducted ₹${deductionAmount} from SEC incentive`
        logEntry.secUser = salesReport.secUser
        logEntry.deductionAmount = deductionAmount
        processResults.logs.push(logEntry)
        processResults.deducted++
        processResults.summary.deductedReports.push({
          ...logEntry,
          store: salesReport.store,
          device: salesReport.samsungSKU,
          plan: salesReport.plan
        })

        console.log(`✅ Processed invalid IMEI ${imei} for SEC ${salesReport.secUser.secId || salesReport.secUser.phone}`)

      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error)
        const logEntry = {
          row: i + 1,
          imei: row['IMEI'] || row['imei'] || 'Unknown',
          action: 'ERROR',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          secUser: null,
          deductionAmount: 0
        }
        processResults.logs.push(logEntry)
        processResults.errors++
        processResults.summary.errorReports.push(logEntry)
      }
    }

    console.log(`📊 Invalid IMEI processing completed:`, {
      total: processResults.total,
      deducted: processResults.deducted,
      errors: processResults.errors,
      skipped: processResults.skipped,
      notificationsSent: processResults.notificationsSent
    })

    res.json({
      success: true,
      message: 'Invalid IMEI Excel file processed successfully',
      data: processResults
    })

  } catch (error) {
    console.error('❌ Error processing invalid IMEI Excel:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process invalid IMEI Excel file',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Process voucher Excel file endpoint
app.post('/api/admin/process-voucher-excel', upload.single('excel'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can process voucher files'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      })
    }

    console.log(`📊 Processing voucher Excel file: ${req.file.originalname}`)

    // Read Excel file
    const workbook = read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = utils.sheet_to_json(worksheet)

    console.log(`📋 Found ${data.length} rows in Excel file`)

    const processResults = {
      total: data.length,
      processed: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
      logs: [] as any[],
      summary: {
        updatedReports: [] as any[],
        errorReports: [] as any[],
        skippedReports: [] as any[]
      }
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i]
      processResults.processed++
      
      try {
        // Get required fields from Excel row
        const reportId = row['Report ID']?.toString()?.trim()
        const paymentStatus = row['Payment Status']?.toString()?.trim()
        const voucherCode = row['Voucher Code']?.toString()?.trim()

        // Log current row processing
        const logEntry = {
          row: i + 1,
          reportId,
          paymentStatus,
          voucherCode,
          action: '',
          success: false,
          message: ''
        }

        // Validation checks
        if (!reportId) {
          logEntry.action = 'SKIP'
          logEntry.message = 'Missing Report ID'
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        if (paymentStatus !== 'Pending') {
          logEntry.action = 'SKIP'
          logEntry.message = 'Payment status is not Pending'
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        if (!voucherCode || voucherCode === '') {
          logEntry.action = 'SKIP'
          logEntry.message = 'No voucher code provided'
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        // Find the sales report in database
        const existingReport = await prisma.salesReport.findUnique({
          where: { id: reportId },
          include: {
            secUser: { select: { secId: true, phone: true } },
            store: { select: { storeName: true } },
            samsungSKU: { select: { ModelName: true } }
          }
        })

        if (!existingReport) {
          logEntry.action = 'ERROR'
          logEntry.message = 'Sales report not found in database'
          processResults.logs.push(logEntry)
          processResults.errors++
          processResults.summary.errorReports.push(logEntry)
          continue
        }

        if (existingReport.isPaid) {
          logEntry.action = 'SKIP'
          logEntry.message = 'Report is already marked as paid'
          processResults.logs.push(logEntry)
          processResults.skipped++
          processResults.summary.skippedReports.push(logEntry)
          continue
        }

        // Update the sales report
        const updatedReport = await prisma.salesReport.update({
          where: { id: reportId },
          data: {
            voucherCode: voucherCode,
            isPaid: true,
            paidAt: new Date()
          }
        })

        logEntry.action = 'UPDATE'
        logEntry.success = true
        logEntry.message = `Updated with voucher code ${voucherCode}`
        processResults.logs.push(logEntry)
        processResults.updated++
        processResults.summary.updatedReports.push({
          ...logEntry,
          secUser: existingReport.secUser,
          store: existingReport.store,
          device: existingReport.samsungSKU,
          incentiveEarned: existingReport.incentiveEarned
        })

        console.log(`✅ Updated report ${reportId} with voucher ${voucherCode}`)

      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error)
        const logEntry = {
          row: i + 1,
          reportId: row['Report ID'] || 'Unknown',
          action: 'ERROR',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
        processResults.logs.push(logEntry)
        processResults.errors++
        processResults.summary.errorReports.push(logEntry)
      }
    }

    console.log(`📊 Voucher processing completed:`, {
      total: processResults.total,
      updated: processResults.updated,
      errors: processResults.errors,
      skipped: processResults.skipped
    })

    res.json({
      success: true,
      message: 'Voucher Excel file processed successfully',
      data: processResults
    })

  } catch (error) {
    console.error('❌ Error processing voucher Excel:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process voucher Excel file',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET SEC incentive summary (earned vs deducted)
app.get('/api/sec/incentive-summary', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can view their incentive summary'
      })
    }

    // Get total incentive earned
    const earnedResult = await prisma.salesReport.aggregate({
      where: { secUserId: decoded.userId },
      _sum: { incentiveEarned: true }
    })

    // Get total deductions
    const deductionResult = await prisma.incentiveDeduction.aggregate({
      where: { secUserId: decoded.userId },
      _sum: { deductionAmount: true }
    })

    const totalEarned = earnedResult._sum.incentiveEarned || 0
    const totalDeducted = deductionResult._sum.deductionAmount || 0
    const netIncentive = totalEarned - totalDeducted

    res.json({
      success: true,
      data: {
        totalEarned,
        totalDeducted,
        netIncentive
      }
    })

  } catch (error) {
    console.error('❌ Error fetching SEC incentive summary:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incentive summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET SEC deductions
app.get('/api/sec/deductions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC users can view their deductions'
      })
    }

    // Fetch deductions for this SEC user
    const deductions = await prisma.incentiveDeduction.findMany({
      where: { secUserId: decoded.userId },
      include: {
        salesReport: {
          include: {
            store: { select: { storeName: true, city: true } },
            samsungSKU: { select: { ModelName: true, Category: true } },
            plan: { select: { planType: true, price: true } }
          }
        }
      },
      orderBy: { processedAt: 'desc' }
    })

    console.log(`✅ Fetched ${deductions.length} deductions for SEC ${decoded.userId}`)
    res.json({
      success: true,
      data: deductions,
      count: deductions.length
    })

  } catch (error) {
    console.error('❌ Error fetching SEC deductions:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deductions',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET leaderboard data
app.get('/api/leaderboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (decoded.role !== 'sec' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only SEC or Admin users can view leaderboard'
      })
    }

    // Find which stores the current SEC user has made sales for (admins won't have a user position)
    let userSalesReports: { storeId: string; store: { storeName: string; city: string } }[] = []
    if (decoded.role === 'sec') {
      userSalesReports = await prisma.salesReport.findMany({
        where: {
          secUserId: decoded.userId
        },
        select: {
          storeId: true,
          store: {
            select: {
              storeName: true,
              city: true
            }
          }
        },
        distinct: ['storeId']
      })
    }

    // Optimized single query to get all leaderboard data - excluding Test_Plan
    const leaderboardRawData = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        plan: {
          planType: {
            not: 'Test_Plan'
          }
        }
      },
      _sum: {
        incentiveEarned: true
      },
      _count: {
        id: true
      }
    })

    // Get store details in a single query
    const storeIds = leaderboardRawData.map(stat => stat.storeId)
    const stores = await prisma.store.findMany({
      where: {
        id: {
          in: storeIds
        }
      },
      select: {
        id: true,
        storeName: true,
        city: true
      }
    })

    // Get plan-specific incentives in two efficient queries
    const adldIncentives = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        storeId: {
          in: storeIds
        },
        plan: {
          planType: 'ADLD_1_Yr'
        }
      },
      _sum: {
        incentiveEarned: true
      }
    })

    const comboIncentives = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        storeId: {
          in: storeIds
        },
        plan: {
          planType: 'Combo_2Yrs'
        }
      },
      _sum: {
        incentiveEarned: true
      }
    })

    // Create lookup maps for efficient data combination
    const storeMap = new Map(stores.map(store => [store.id, store]))
    const adldMap = new Map(adldIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))
    const comboMap = new Map(comboIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))

    // Combine all data efficiently
    const detailedStats = leaderboardRawData.map(storeStat => {
      const store = storeMap.get(storeStat.storeId)
      return {
        storeId: storeStat.storeId,
        storeName: store?.storeName || 'Unknown Store',
        city: store?.city || 'Unknown City',
        totalIncentive: storeStat._sum.incentiveEarned || 0,
        adldIncentive: adldMap.get(storeStat.storeId) || 0,
        comboIncentive: comboMap.get(storeStat.storeId) || 0,
        totalSales: storeStat._count.id
      }
    })

    // Sort with multi-level criteria: Total (desc) -> Combo (desc) -> Store Name (asc)
    const sortedStats = detailedStats
      .sort((a, b) => {
        // Primary sort: Total incentive (descending - higher is better)
        if (b.totalIncentive !== a.totalIncentive) {
          return b.totalIncentive - a.totalIncentive
        }
        
        // Secondary sort: Combo incentive (descending - higher is better)
        if (b.comboIncentive !== a.comboIncentive) {
          return b.comboIncentive - a.comboIncentive
        }
        
        // Tertiary sort: Store name (ascending - alphabetical)
        return a.storeName.localeCompare(b.storeName, 'en', { 
          numeric: true, 
          sensitivity: 'base' 
        })
      })
      .map((stat, index) => ({
        ...stat,
        rank: index + 1
      }))

    // Find current user's store position based on their sales reports
    // If user has sales for multiple stores, we'll show the best performing one
    let userPosition = null
    if (userSalesReports.length > 0) {
      // Find the best performing store where this user has made sales
      const userStorePositions = userSalesReports.map(userStore => 
        sortedStats.find(stat => stat.storeId === userStore.storeId)
      ).filter(Boolean)
      
      if (userStorePositions.length > 0) {
        // Get the store with the best rank (lowest rank number)
        userPosition = userStorePositions.reduce((best, current) => 
          (current && (!best || current.rank < best.rank)) ? current : best
        )
      }
    }

    console.log(`✅ Leaderboard fetched with ${sortedStats.length} stores`)
    res.json({
      success: true,
      data: {
        leaderboard: sortedStats,
        userPosition: userPosition || null
      }
    })

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
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

// For local development - start server if not in Vercel environment
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    // Run essential data checks on startup (silently)
    await ensureEssentialSKUs()
    
    console.log(`🚀 API Server running on http://localhost:${PORT}`)
    console.log(`📍 Available endpoints:`)
    console.log(`   GET /api/health - Health check`)
    console.log(`🔐 Authentication:`)
    console.log(`   POST /api/auth/send-otp - Send OTP to SEC phone`)
    console.log(`   POST /api/auth/verify-otp - Verify OTP and login SEC`)
    console.log(`   POST /api/auth/admin-login - Admin login`)
    console.log(`   PUT /api/auth/update-profile - Update SEC profile`)
    console.log(`   POST /api/auth/logout - Logout user`)
    console.log(`📊 Data:`)
    console.log(`   GET /api/stores - Fetch all stores`)
    console.log(`   GET /api/samsung-skus - Fetch all Samsung SKUs`)
    console.log(`   GET /api/samsung-skus/:id/plans - Fetch plans for specific SKU`)
    console.log(`   GET /api/plans - Fetch all plans`)
    console.log(`   GET /api/plan-price?skuId=:id&planType=:type - Get specific plan price`)
    console.log(`📝 Reports:`)
    console.log(`   POST /api/reports/submit - Submit sales report`)
    console.log(`   GET /api/reports/sec - Get SEC user reports`)
    console.log(`   GET /api/reports/admin - Get all reports (admin)`)
  })
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Run essential data checks for serverless environment
if (process.env.VERCEL) {
  // For serverless, we need to run this on first import
  (async () => {
    try {
      await ensureEssentialSKUs()
    } catch (error) {
      console.error('❌ Failed to run essential data checks on serverless startup:', error)
    }
  })()
}

// Export for Vercel serverless functions
export default app
