import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET

// Check if JWT_SECRET is properly configured
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!')
  process.exit(1)
}

// Middleware
app.use(cors({ credentials: true, origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }))
app.use(express.json())
app.use(cookieParser())

// Helper functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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
    'ADLD_1_Yr': 150,                // Fixed ₹150
    'Combo_2Yrs': 250,               // Fixed ₹250
    'Extended_Warranty_1_Yr': 0,     // No incentive
    'Screen_Protect_1_Yr': 0         // No incentive
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
        imei: imei.trim(),
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
    
    console.log(`✅ Sales report saved to database! Report ID: ${salesReport.id}, SEC: ${decoded.userId}, IMEI: ${imei}, Incentive: ₹${incentiveEarned}`)
    
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

  } catch (error) {
    console.error('❌ Error submitting sales report:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit sales report',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})