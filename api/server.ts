import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import { utils, read } from 'xlsx'

const app = express()
const prisma = new PrismaClient({ log: ['warn', 'error'] })
const PORT = Number(process.env.PORT) || 3001
// In dev, fall back to an insecure default to avoid crashing; require real secret in production
const JWT_SECRET: string = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-insecure-secret')

// Test invite configuration
const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '')
const LINK_SIGNING_SECRET = process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_LINK_SECRET || ''
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const COMIFY_API_KEY = process.env.COMIFY_API_KEY || ''
const COMIFY_BASE_URL = process.env.COMIFY_BASE_URL || 'https://commify.transify.tech/v1'
const COMIFY_TEMPLATE_NAME_LINK = process.env.COMIFY_TEMPLATE_NAME_LINK || ''

// Enforce secret only in production (dev uses fallback above)
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set! Set JWT_SECRET in the environment.')
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
    console.log('🔎 /verify-otp called', { query: req.query, bodyKeys: Object.keys(req.body || {}) })
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
    let newUserCreated = false
    try {
      console.log('🔎 Checking SEC user existence for', phone)
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
        console.log('🔎 Creating new SEC user for', phone)
        // Create new user - don't set secId at all to avoid unique constraint issues
        secUser = await prisma.sECUser.create({
          data: {
            phone,
            lastLoginAt: new Date()
            // Do not include secId field at all - let it be undefined rather than null
          },
          include: { store: true }
        })
        newUserCreated = true
        console.log(`✅ New SEC user created for phone: ${phone}`)
      }
    } catch (dbError) {
      console.error(`❌ Failed to find/create SEC user for ${phone}:`, dbError)
      throw dbError
    }

    // Referral capture: only on first user creation and if valid referal_code present in query
    try {
      const referralCodeRaw = (req.query.referal_code || req.query.referral_code || req.query.referal || req.body?.referralCode) as string | undefined
      const referralCode = referralCodeRaw?.trim()
      console.log('🔎 Referral capture check', { newUserCreated, referralCode })
      if (newUserCreated && referralCode && /^\d{10}$/.test(referralCode) && referralCode !== phone) {
        // Check referrer exists as SEC user
        console.log('🔎 Looking up referrer', referralCode)
        const referrer = await prisma.sECUser.findUnique({ where: { phone: referralCode } })
        if (referrer) {
          // Ensure pair not already created
          console.log('🔎 Checking existing referral pair')
          const existingPair = await prisma.referral.findUnique({
            where: { referrerPhone_refereePhone: { referrerPhone: referralCode, refereePhone: phone } }
          })
          if (!existingPair) {
            await prisma.referral.create({
              data: { referrerPhone: referralCode, refereePhone: phone, status: 'joined' as any }
            })
            console.log(`🤝 Referral recorded: ${referralCode} -> ${phone}`)
          }
        } else {
          console.log(`ℹ️ Referral code ${referralCode} not linked to any SEC; skipping.`)
        }
      }
    } catch (refErr) {
      console.warn('⚠️ Referral capture failed (non-blocking):', refErr)
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
 * GET /api/sec/by-phone
 * Fetch SEC details (name, secId, store) by phone for test access
 */
app.get('/api/sec/by-phone', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' })
    const clean = phone.startsWith('91') ? phone.slice(2) : phone
    if (!/^\d{10}$/.test(clean)) return res.status(400).json({ success: false, message: 'invalid phone' })

    const user = await prisma.sECUser.findUnique({ where: { phone: clean }, include: { store: true } })
    if (!user) return res.json({ success: true, data: { phone: clean, secId: null, name: null, store: null } })

    return res.json({
      success: true,
      data: {
        phone: user.phone,
        secId: user.secId,
        name: user.name,
        store: user.store ? { storeName: user.store.storeName, city: user.store.city } : null
      }
    })
  } catch (e) {
    return res.status(500).json({ success: false, message: 'failed', error: e instanceof Error ? e.message : 'error' })
  }
})

/**
 * POST /api/referrals/join
 * A SEC logs in with a referral code to join as referee.
 */
app.post('/api/referrals/join', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }
    const token = authHeader.split(' ')[1]
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    if (decoded.role !== 'sec') {
      return res.status(403).json({ success: false, message: 'Only SEC users can join referrals' })
    }

    const { referralCode } = req.body as { referralCode?: string }
    const refereePhone = decoded.phone || decoded?.phone || decoded?.userPhone || decoded?.user?.phone || decoded?.sub || null
    const cleanRef = (referralCode || '').trim()

    if (!cleanRef || !/^\d{10}$/.test(cleanRef)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit referral code is required' })
    }
    if (!refereePhone || !/^\d{10}$/.test(refereePhone)) {
      return res.status(400).json({ success: false, message: 'Your account does not have a valid 10-digit phone' })
    }
    if (cleanRef === refereePhone) {
      return res.status(400).json({ success: false, message: 'You cannot refer yourself' })
    }

    // Prevent duplicates per pair
    const existing = await prisma.referral.findUnique({
      where: { referrerPhone_refereePhone: { referrerPhone: cleanRef, refereePhone } }
    })
    if (existing) return res.json({ success: true, data: existing })

            console.log('🔎 Creating referral record')
            const created = await prisma.referral.create({
      data: { referrerPhone: cleanRef, refereePhone, status: 'joined' as any }
    })

    return res.json({ success: true, data: created })
  } catch (error) {
    console.error('❌ Referral join failed:', error)
    return res.status(500).json({ success: false, message: 'Failed to join referral' })
  }
})

/**
 * GET /api/referrals/me
 * Fetch referrals where the SEC is a referrer or referee.
 */
app.get('/api/referrals/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }
    const token = authHeader.split(' ')[1]
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    if (decoded.role !== 'sec') {
      return res.status(403).json({ success: false, message: 'Only SEC users can view referrals' })
    }

    const phone = decoded.phone || decoded?.phone || null
    if (!phone) return res.status(400).json({ success: false, message: 'Phone not available in token' })

    const [asReferrer, asReferee] = await Promise.all([
      prisma.referral.findMany({ where: { referrerPhone: phone }, orderBy: { createdAt: 'desc' } }),
      prisma.referral.findMany({ where: { refereePhone: phone }, orderBy: { createdAt: 'desc' } })
    ])

    // Map to include only their voucher side for safety on client
    const sanitize = (r: any, role: 'referrer' | 'referee') => ({
      id: r.id,
      referrerPhone: r.referrerPhone,
      refereePhone: r.refereePhone,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      voucher: role === 'referrer' ? r.referrerVoucher : r.refereeVoucher,
      role,
    })

    const data = [
      ...asReferrer.map(r => sanitize(r, 'referrer')),
      ...asReferee.map(r => sanitize(r, 'referee'))
    ]

    return res.json({ success: true, data, count: data.length })
  } catch (error) {
    console.error('❌ Fetch referrals failed:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch referrals' })
  }
})

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
 * GET /api/referrals/admin - list all referrals (admin only)
 */
app.get('/api/referrals/admin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }
    const token = authHeader.split(' ')[1]
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can view referrals' })
    }

    const list = await prisma.referral.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return res.json({ success: true, data: list, count: list.length })
  } catch (error) {
    console.error('❌ Error fetching referrals (admin):', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch referrals' })
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

    // Check if this is the first sale for this SEC (before creating new one)
    const existingSalesCount = await prisma.salesReport.count({ where: { secUserId: decoded.userId } })

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
    
    // If this was the first sale for this SEC, update referral status to report_submitted
    try {
      if (existingSalesCount === 0 && decoded?.phone) {
        const updated = await prisma.referral.updateMany({
          where: { refereePhone: decoded.phone, status: 'joined' as any },
          data: { status: 'report_submitted' as any }
        })
        if (updated.count > 0) {
          console.log(`🤝 Referral status updated to report_submitted for referee ${decoded.phone}`)
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to update referral status (non-blocking):', e)
    }

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
    const { storeId, samsungSKUId, planId, imei, dateOfSale } = req.body
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

    // First-sale check for this SEC (before insert)
    const existingSalesCountAlias = await prisma.salesReport.count({ where: { secUserId: decoded.userId } })

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' })

    const incentiveEarned = calculateIncentive(plan.planType)

    // Parse dateOfSale (format: DD-MM-YYYY) to Date object
    let submittedAtDate = new Date()
    if (dateOfSale && typeof dateOfSale === 'string') {
      const [day, month, year] = dateOfSale.split('-').map(Number)
      if (day && month && year) {
        // Create date in IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000
        submittedAtDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - istOffset)
      }
    }

    const salesReport = await prisma.salesReport.create({
      data: {
        secUserId: decoded.userId,
        storeId,
        samsungSKUId,
        planId,
        imei: trimmedImei,
        planPrice: plan.price,
        incentiveEarned,
        submittedAt: submittedAtDate
      }
    })

    // If first sale, update referral status
    try {
      if (existingSalesCountAlias === 0 && decoded?.phone) {
        const updated = await prisma.referral.updateMany({
          where: { refereePhone: decoded.phone, status: 'joined' as any },
          data: { status: 'report_submitted' as any }
        })
        if (updated.count > 0) console.log(`🤝 Referral status updated (alias route) for referee ${decoded.phone}`)
      }
    } catch (e) {
      console.warn('⚠️ Failed to update referral status (alias, non-blocking):', e)
    }

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
        createdAt: 'desc'
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

// Process referral voucher Excel (admin)
app.post('/api/admin/process-referral-excel', upload.single('excel'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' })
    }
    const token = authHeader.split(' ')[1]
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin users can process referrals' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required' })
    }

    const workbook = read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = utils.sheet_to_json(worksheet)

    const results = {
      total: data.length,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      logs: [] as any[],
      summary: {
        updated: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      }
    }

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i]
      results.processed++
      const log = {
        row: i + 1,
        referrerPhone: String(row['Referrer Phone'] || row['referrerPhone'] || '').trim(),
        refereePhone: String(row['Referee Phone'] || row['refereePhone'] || '').trim(),
        referrerVoucher: String(row['Referrer Voucher'] || row['referrerVoucher'] || '').trim(),
        refereeVoucher: String(row['Referee Voucher'] || row['refereeVoucher'] || '').trim(),
        status: String(row['Status'] || row['status'] || '').trim(),
        action: 'SKIP',
        success: false,
        message: ''
      }
      try {
        if (!log.referrerPhone || !log.refereePhone) {
          log.message = 'Missing referrer/referee phone'
          results.skipped++; results.logs.push(log); results.summary.skipped.push(log); continue
        }
        // Select record
        const referral = await prisma.referral.findUnique({
          where: { referrerPhone_refereePhone: { referrerPhone: log.referrerPhone, refereePhone: log.refereePhone } }
        })
        if (!referral) {
          log.action = 'ERROR'; log.message = 'Referral pair not found'; results.errors++; results.logs.push(log); results.summary.errors.push(log); continue
        }
        if (referral.status !== 'report_submitted') {
          log.message = `Status is '${referral.status}', expected 'report_submitted'`; results.skipped++; results.logs.push(log); results.summary.skipped.push(log); continue
        }
        if (!log.referrerVoucher && !log.refereeVoucher) {
          log.message = 'No vouchers provided'; results.skipped++; results.logs.push(log); results.summary.skipped.push(log); continue
        }
        // Update
        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            referrerVoucher: log.referrerVoucher || referral.referrerVoucher,
            refereeVoucher: log.refereeVoucher || referral.refereeVoucher,
            status: 'voucher_initiated' as any
          }
        })
        log.action = 'UPDATE'; log.success = true; log.message = 'Vouchers saved & status updated'
        results.updated++; results.logs.push(log); results.summary.updated.push(log)
      } catch (e: any) {
        log.action = 'ERROR'; log.message = e?.message || 'Unknown error'; results.errors++; results.logs.push(log); results.summary.errors.push(log)
      }
    }

    return res.json({ success: true, data: results })
  } catch (error) {
    console.error('❌ Error processing referral Excel:', error)
    return res.status(500).json({ success: false, message: 'Failed to process referral Excel' })
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

    // Latest and first submission per store (for tie-breakers and "New" badge)
    const lastSubmissions = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: { not: 'Test_Plan' } } },
      _max: { submittedAt: true }
    })
    const firstSubmissions = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: { not: 'Test_Plan' } } },
      _min: { submittedAt: true }
    })

    // Calculate IST (UTC+5:30) timezone dates
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const startOfToday = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate())

    // Create lookup maps for efficient data combination
    const storeMap = new Map(stores.map(store => [store.id, store]))
    const adldMap = new Map(adldIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))
    const comboMap = new Map(comboIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))
    const lastMap = new Map(lastSubmissions.map(item => [item.storeId, item._max.submittedAt || null]))
    const firstMap = new Map(firstSubmissions.map(item => [item.storeId, item._min.submittedAt || null]))

    // Combine all data efficiently
    const detailedStats = leaderboardRawData
      .map(storeStat => {
        const store = storeMap.get(storeStat.storeId)
        const first = firstMap.get(storeStat.storeId) as Date | null
        const isNewToday = first ? first >= startOfToday : false
        return {
          storeId: storeStat.storeId,
          storeName: store?.storeName || 'Unknown Store',
          city: store?.city || 'Unknown City',
          totalIncentive: storeStat._sum.incentiveEarned || 0,
          adldIncentive: adldMap.get(storeStat.storeId) || 0,
          comboIncentive: comboMap.get(storeStat.storeId) || 0,
          lastSubmittedAt: lastMap.get(storeStat.storeId) || null,
          firstSubmittedAt: first,
          isNewToday,
          totalSales: storeStat._count.id
        }
      })
      // Exclude specific stores from leaderboard
      .filter(stat => (stat.storeName || '').replace(/\s+/g, '').toLowerCase() !== 'teststore')

    // Sort with multi-level criteria: Total (desc) -> ADLD (desc) -> Latest submission (desc)
    const sortedStats = detailedStats
      .sort((a, b) => {
        // Primary sort: Total incentive (descending - higher is better)
        if (b.totalIncentive !== a.totalIncentive) {
          return b.totalIncentive - a.totalIncentive
        }
        
        // Secondary sort: ADLD incentive (descending - higher is better)
        if (b.adldIncentive !== a.adldIncentive) {
          return b.adldIncentive - a.adldIncentive
        }
        
        // Tertiary sort: Most recent submission (descending - newer is better)
        const bt = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0
        const at = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0
        if (bt !== at) return bt - at

        // Final fallback: Store name alphabetical
        return a.storeName.localeCompare(b.storeName, 'en', { 
          numeric: true, 
          sensitivity: 'base' 
        })
      })
      .map((stat, index) => ({
        ...stat,
        rank: index + 1
      }))

    // Compute previous snapshot up to yesterday 23:59:59 to derive rank movement
    const endOfYesterday = new Date(startOfToday.getTime() - 1)

    const prevRaw = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        submittedAt: { lte: endOfYesterday },
        plan: { planType: { not: 'Test_Plan' } }
      },
      _sum: { incentiveEarned: true }
    })

    const prevStoreIds = prevRaw.map(s => s.storeId)
    const prevTotals = new Map(prevRaw.map(s => [s.storeId, s._sum.incentiveEarned || 0]))
    const prevStats = prevStoreIds.map(id => ({
      storeId: id,
      totalIncentive: prevTotals.get(id) || 0,
      storeName: storeMap.get(id)?.storeName || ''
    }))
    const prevSorted = prevStats
      .sort((a, b) => {
        if ((b.totalIncentive || 0) !== (a.totalIncentive || 0)) return (b.totalIncentive || 0) - (a.totalIncentive || 0)
        return (a.storeName || '').localeCompare(b.storeName || '', 'en', { numeric: true, sensitivity: 'base' })
      })
      .map((s, i) => ({ storeId: s.storeId, rank: i + 1 }))

    const prevRankMap = new Map(prevSorted.map(x => [x.storeId, x.rank]))
    const withChange = sortedStats.map(s => ({
      ...s,
      rankChange: (prevRankMap.get(s.storeId) ?? s.rank) - s.rank
    }))

    // Find current user's store position based on their sales reports
    // If user has sales for multiple stores, we'll show the best performing one
    let userPosition = null
    if (userSalesReports.length > 0) {
      // Find the best performing store where this user has made sales
      const userStorePositions = userSalesReports.map(userStore => 
        withChange.find(stat => stat.storeId === userStore.storeId)
      ).filter(Boolean)
      
      if (userStorePositions.length > 0) {
        // Get the store with the best rank (lowest rank number)
        userPosition = userStorePositions.reduce((best, current) => 
          (current && (!best || (current as any).rank < (best as any).rank)) ? current : best
        )
      }
    }

    console.log(`✅ Leaderboard fetched with ${withChange.length} stores`)
    res.json({
      success: true,
      data: {
        leaderboard: withChange,
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

// Admin leaderboard (no user ranking section)
app.get('/api/admin/leaderboard', async (req, res) => {
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

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin users can view leaderboard' })
    }

    // Current (all-time cumulative, excluding Test_Plan)
    const leaderboardRawData = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        plan: { planType: { not: 'Test_Plan' } }
      },
      _sum: { incentiveEarned: true },
      _count: { id: true }
    })

    const storeIds = leaderboardRawData.map(stat => stat.storeId)
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, storeName: true, city: true }
    })

    const adldIncentives = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: 'ADLD_1_Yr' } },
      _sum: { incentiveEarned: true }
    })

    const comboIncentives = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: 'Combo_2Yrs' } },
      _sum: { incentiveEarned: true }
    })

    const lastSubmissionsAdmin = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: { not: 'Test_Plan' } } },
      _max: { submittedAt: true }
    })
    const firstSubmissionsAdmin = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, plan: { planType: { not: 'Test_Plan' } } },
      _min: { submittedAt: true }
    })

    const nowAdmin = new Date()
    const startOfTodayAdmin = new Date(nowAdmin.getFullYear(), nowAdmin.getMonth(), nowAdmin.getDate())

    const storeMap = new Map(stores.map(store => [store.id, store]))
    const adldMap = new Map(adldIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))
    const comboMap = new Map(comboIncentives.map(item => [item.storeId, item._sum.incentiveEarned || 0]))
    const lastMapAdmin = new Map(lastSubmissionsAdmin.map(item => [item.storeId, item._max.submittedAt || null]))
    const firstMapAdmin = new Map(firstSubmissionsAdmin.map(item => [item.storeId, item._min.submittedAt || null]))

    const detailedStats = leaderboardRawData
      .map(storeStat => {
        const store = storeMap.get(storeStat.storeId)
        const first = firstMapAdmin.get(storeStat.storeId) as Date | null
        const isNewToday = first ? first >= startOfTodayAdmin : false
        return {
          storeId: storeStat.storeId,
          storeName: store?.storeName || 'Unknown Store',
          city: store?.city || 'Unknown City',
          totalIncentive: storeStat._sum.incentiveEarned || 0,
          adldIncentive: adldMap.get(storeStat.storeId) || 0,
          comboIncentive: comboMap.get(storeStat.storeId) || 0,
          lastSubmittedAt: lastMapAdmin.get(storeStat.storeId) || null,
          firstSubmittedAt: first,
          isNewToday,
          totalSales: storeStat._count.id
        }
      })
      // Exclude specific stores from leaderboard
      .filter(stat => (stat.storeName || '').replace(/\s+/g, '').toLowerCase() !== 'teststore')

    const sortedStats = detailedStats
      .sort((a, b) => {
        if (b.totalIncentive !== a.totalIncentive) return b.totalIncentive - a.totalIncentive
        if (b.adldIncentive !== a.adldIncentive) return b.adldIncentive - a.adldIncentive
        const bt = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0
        const at = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0
        if (bt !== at) return bt - at
        return a.storeName.localeCompare(b.storeName, 'en', { numeric: true, sensitivity: 'base' })
      })
      .map((stat, index) => ({ ...stat, rank: index + 1 }))

    // Previous snapshot: up to yesterday 23:59:59 IST (Indian Standard Time)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const startOfToday = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate())
    const endOfYesterday = new Date(startOfToday.getTime() - 1)

    const prevRaw = await prisma.salesReport.groupBy({
      by: ['storeId'],
      where: {
        submittedAt: { lte: endOfYesterday },
        plan: { planType: { not: 'Test_Plan' } }
      },
      _sum: { incentiveEarned: true }
    })

    // Build previous ranking list (only stores with any historical sales up to yesterday)
    const prevStoreIds = prevRaw.map(s => s.storeId)
    const prevTotals = new Map(prevRaw.map(s => [s.storeId, s._sum.incentiveEarned || 0]))

    // Compose previous stats comparable to current (names just for potential future use)
    const prevStats = prevStoreIds.map(id => ({
      storeId: id,
      totalIncentive: prevTotals.get(id) || 0,
      comboIncentive: 0,
      storeName: storeMap.get(id)?.storeName || '',
    }))
    const prevSorted = prevStats
      .sort((a, b) => {
        if ((b.totalIncentive || 0) !== (a.totalIncentive || 0)) return (b.totalIncentive || 0) - (a.totalIncentive || 0)
        // tie-breaker: store name
        return (a.storeName || '').localeCompare(b.storeName || '', 'en', { numeric: true, sensitivity: 'base' })
      })
      .map((s, i) => ({ storeId: s.storeId, rank: i + 1 }))

    const prevRankMap = new Map(prevSorted.map(x => [x.storeId, x.rank]))

    const withChange = sortedStats.map(s => ({
      ...s,
      rankChange: (prevRankMap.get(s.storeId) ?? s.rank) - s.rank
    }))

    console.log(`✅ Admin leaderboard fetched with ${withChange.length} stores (yesterday snapshot @ ${endOfYesterday.toISOString()})`)
    return res.json({ success: true, data: { leaderboard: withChange } })
  } catch (error) {
    console.error('❌ Error fetching admin leaderboard:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch admin leaderboard' })
  }
})

// ========== Test Invites: link signing, verification, and WhatsApp sending ==========
function hmac(data: string): string {
  if (!LINK_SIGNING_SECRET) throw new Error('LINK_SIGNING_SECRET is not set')
  return crypto.createHmac('sha256', LINK_SIGNING_SECRET).update(data).digest('hex')
}

function buildAppUrl(req: express.Request) {
  if (APP_BASE_URL) return APP_BASE_URL
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
  const host = req.get('host')
  return `${proto}://${host}`
}

// Legacy: secId-based links
function createSignedLink(req: express.Request, secId: string, expiresInSeconds = 72 * 3600) {
  const ts = Math.floor(Date.now() / 1000) + expiresInSeconds // expiry timestamp (seconds)
  const data = `${secId}.${ts}`
  const sig = hmac(data)
  const base = buildAppUrl(req)
  const link = `${base}/test?secId=${encodeURIComponent(secId)}&ts=${ts}&sig=${sig}`
  return { link, sig, ts }
}

// New: phone-based links
function createSignedLinkByPhone(req: express.Request, phone: string, expiresInSeconds = 72 * 3600) {
  const ts = Math.floor(Date.now() / 1000) + expiresInSeconds
  const data = `${phone}.${ts}`
  const sig = hmac(data)
  const base = buildAppUrl(req)
  const link = `${base}/test?phone=${encodeURIComponent(phone)}&ts=${ts}&sig=${sig}`
  return { link, sig, ts }
}

function verifySignature(dataValue: string, ts: number, sig: string) {
  const now = Math.floor(Date.now() / 1000)
  if (!ts || ts < now) return { valid: false, reason: 'expired' }
  const expected = hmac(`${dataValue}.${ts}`)
  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  return { valid, reason: valid ? undefined : 'invalid_signature' }
}

async function sendWhatsAppInviteMinimal(phone: string, message: string) {
  // Prefer Comify template if configured
  if (COMIFY_API_KEY && COMIFY_TEMPLATE_NAME_LINK) {
    // Expect template to have variables: {link}
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`
    const resp = await fetch(`${COMIFY_BASE_URL}/comm`, {
      method: 'POST',
      headers: { 'Authorization': `ApiKey ${COMIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: COMIFY_TEMPLATE_NAME_LINK,
        payload: { phone: formattedPhone, link: message },
        type: 'whatsappTemplate'
      })
    })
    const json = await resp.json()
    if (!resp.ok) throw new Error(`Comify error: ${json?.message || 'unknown'}`)
    return json
  }

  // Fallback to WhatsApp Cloud API plain text
  if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { preview_url: true, body: message }
      })
    })
    const json = await resp.json()
    if (!resp.ok) throw new Error(`WhatsApp API error: ${json?.error?.message || 'unknown'}`)
    return json
  }

  throw new Error('No WhatsApp provider configured (set COMIFY_* or WHATSAPP_* env vars)')
}

// Sign a test link (phone preferred; secId supported for legacy)
app.post('/api/tests/sign', (req, res) => {
  try {
    const { phone, secId, expiresInSeconds } = req.body || {}
    if (!LINK_SIGNING_SECRET) return res.status(500).json({ success: false, message: 'LINK_SIGNING_SECRET not configured' })
    if (phone && typeof phone === 'string') {
      const result = createSignedLinkByPhone(req, phone, Number(expiresInSeconds) || undefined)
      return res.json({ success: true, ...result })
    }
    if (secId && typeof secId === 'string') {
      const result = createSignedLink(req, secId, Number(expiresInSeconds) || undefined)
      return res.json({ success: true, ...result })
    }
    return res.status(400).json({ success: false, message: 'phone is required' })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// Verify a signed link (supports token or HMAC for phone or legacy secId)
app.get('/api/tests/verify', (req, res) => {
  try {
    const token = req.query.token ? String(req.query.token) : undefined
    if (token) {
      try {
        const decoded = jwt.verify(token, LINK_SIGNING_SECRET || JWT_SECRET) as any
        // Expect token to contain phone and exp
        if (!decoded?.phone) return res.json({ valid: false, reason: 'missing_phone' })
        return res.json({ valid: true })
      } catch (e) {
        return res.json({ valid: false, reason: 'invalid_token' })
      }
    }

    const phone = req.query.phone ? String(req.query.phone) : undefined
    const secId = req.query.secId ? String(req.query.secId) : undefined
    const ts = Number(req.query.ts || 0)
    const sig = String(req.query.sig || '')
    if ((phone || secId) && ts && sig) {
      const dataValue = phone || secId!
      const result = verifySignature(dataValue, ts, sig)
      return res.json(result)
    }
    return res.json({ valid: false, reason: 'missing_params' })
  } catch (e) {
    return res.status(500).json({ valid: false, reason: 'internal_error' })
  }
})

// Send single invite (phone-based)
app.post('/api/tests/invite', async (req, res) => {
  try {
    const { phone, secId, expiresInSeconds } = req.body || {}
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' })
    const { link } = createSignedLinkByPhone(req, phone, Number(expiresInSeconds) || undefined)
    const msg = `Your SEC assessment link:\n${link}\n\nThis link expires soon. Please complete within the allotted time.`
    const provider = await sendWhatsAppInviteMinimal(phone, msg)
    return res.json({ success: true, link, provider, meta: { legacySecId: secId || null } })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// Bulk invites
app.post('/api/tests/invite-bulk', async (req, res) => {
  try {
    const { invites, expiresInSeconds } = req.body || {}
    if (!Array.isArray(invites) || invites.length === 0) {
      return res.status(400).json({ success: false, message: 'invites array required' })
    }
    const results: any[] = []
    for (const item of invites) {
      const { secId, phone } = item || {}
      try {
        const result = await (await fetch(`${buildAppUrl(req)}/api/tests/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, secId, expiresInSeconds })
        })).json()
        results.push({ secId, phone, ...result })
      } catch (e: any) {
        results.push({ secId, phone, success: false, message: e?.message || 'error' })
      }
    }
    return res.json({ success: true, results })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// Proctoring event endpoints
const inMemoryProctoringEvents: any[] = []

app.post('/api/proctoring/event', async (req, res) => {
  try {
    const { secId, sessionToken, eventType, details } = req.body || {}
    if (!secId || !eventType) return res.status(400).json({ success: false, message: 'secId and eventType are required' })

    // Try Prisma if model exists; otherwise, store in-memory
    try {
      // @ts-ignore
      if (prisma.proctoringEvent) {
        // @ts-ignore
        const saved = await prisma.proctoringEvent.create({ data: { secId, sessionToken, eventType, details } })
        return res.json({ success: true, data: saved })
      }
    } catch (e) {
      console.warn('Proctoring DB write failed, falling back to memory:', e)
    }

    const ev = { id: `${Date.now()}`, secId, sessionToken, eventType, details, createdAt: new Date().toISOString() }
    inMemoryProctoringEvents.push(ev)
    return res.json({ success: true, data: ev })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// Optional: JWT-based link signing for tests
app.post('/api/tests/sign-jwt', (req, res) => {
  try {
    const { phone, expiresInSeconds } = req.body || {}
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' })
    const exp = Math.floor(Date.now() / 1000) + (Number(expiresInSeconds) || 72 * 3600)
    const token = jwt.sign({ phone, exp }, LINK_SIGNING_SECRET || JWT_SECRET)
    const base = buildAppUrl(req)
    const link = `${base}/test?token=${encodeURIComponent(token)}`
    return res.json({ success: true, link, token, exp })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

app.get('/api/proctoring/events', async (req, res) => {
  try {
    const secId = req.query.secId ? String(req.query.secId) : undefined
    try {
      // @ts-ignore
      if (prisma.proctoringEvent) {
        // @ts-ignore
        const where = secId ? { where: { secId }, orderBy: { createdAt: 'desc' } } : { orderBy: { createdAt: 'desc' } }
        // @ts-ignore
        const events = await prisma.proctoringEvent.findMany(where)
        return res.json({ success: true, data: events })
      }
    } catch (e) {
      console.warn('Proctoring DB read failed, using memory:', e)
    }

    const events = secId ? inMemoryProctoringEvents.filter(e => e.secId === secId) : inMemoryProctoringEvents
    return res.json({ success: true, data: events })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

app.get('/api/proctoring/score', async (req, res) => {
  try {
    const secId = String(req.query.secId || '')
    if (!secId) return res.status(400).json({ success: false, message: 'secId required' })

    const weights: Record<string, number> = {
      tab_switch: 15,
      window_blur: 10,
      no_face: 25,
      multi_face: 40,
      loud_noise: 10,
      mic_active: 5,
      video_off: 30,
      snapshot: 0, // neutral event; just for tracking
    }

    let events: any[] = []
    try {
      // @ts-ignore
      if (prisma.proctoringEvent) {
        // @ts-ignore
        events = await prisma.proctoringEvent.findMany({ where: { secId } })
      }
    } catch {
      events = inMemoryProctoringEvents.filter(e => e.secId === secId)
    }

    const penalty = events.reduce((sum, e) => sum + (weights[e.eventType] || 0), 0)
    const score = Math.max(0, 100 - penalty)

    return res.json({ success: true, secId, score, events })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// Cloudinary signature endpoint for signed uploads
app.get('/api/cloudinary-signature', (req, res) => {
  try {
    // Prefer consolidated CLOUDINARY_URL; fallback to discrete env vars
    const envUrl = process.env.CLOUDINARY_URL || ''
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
    let apiKey = process.env.CLOUDINARY_API_KEY || ''
    let apiSecret = process.env.CLOUDINARY_API_SECRET || ''

    if (envUrl) {
      try {
        const u = new URL(envUrl)
        if (!cloudName) cloudName = u.hostname
        if (!apiKey) apiKey = decodeURIComponent(u.username)
        if (!apiSecret) apiSecret = decodeURIComponent(u.password)
      } catch {}
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ success: false, message: 'Cloudinary not configured' })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = (typeof req.query.folder === 'string' ? req.query.folder : undefined) || undefined
    const upload_preset = (typeof req.query.upload_preset === 'string' ? req.query.upload_preset : undefined) || undefined

    // Build params to sign (alphabetically sorted keys)
    const params: Record<string, string | number> = { timestamp }
    if (folder) params.folder = folder
    if (upload_preset) params.upload_preset = upload_preset

    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')

    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')

    return res.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      uploadPreset: upload_preset || null,
    })
  } catch (e) {
    return res.status(500).json({ success: false, message: 'signature_error' })
  }
})

// ========== Test Submission Endpoints ==========

// POST /api/test-submissions - Submit a test result
app.post('/api/test-submissions', async (req, res) => {
  try {
    const { secId, sessionToken, responses, score, totalQuestions, completionTime, isProctoringFlagged } = req.body
    
    if (!secId || !responses || score === undefined || !totalQuestions) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const submission = await prisma.testSubmission.create({
      data: {
        secId,
        sessionToken: sessionToken || 'test-token',
        responses,
        score,
        totalQuestions,
        completionTime: completionTime || 0,
        isProctoringFlagged: isProctoringFlagged || false
      }
    })

    console.log(`✅ Test submission created for SEC ${secId}, Score: ${score}%`)
    return res.json({ success: true, data: submission })
  } catch (e: any) {
    console.error('❌ Error creating test submission:', e)
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// GET /api/test-submissions/statistics - Get test statistics (must come before generic GET)
app.get('/api/test-submissions/statistics', async (req, res) => {
  try {
    const submissions = await prisma.testSubmission.findMany()
    
    if (submissions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalSubmissions: 0,
          averageScore: 0,
          passRate: 0,
          averageTime: 0
        }
      })
    }
    
    const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0)
    const avgScore = Math.round(totalScore / submissions.length)
    
    const passed = submissions.filter(sub => sub.score >= 60).length
    const passRate = Math.round((passed / submissions.length) * 100)
    
    const totalTime = submissions.reduce((sum, sub) => sum + sub.completionTime, 0)
    const avgTime = Math.round(totalTime / submissions.length)
    
    return res.json({
      success: true,
      data: {
        totalSubmissions: submissions.length,
        averageScore: avgScore,
        passRate,
        averageTime: avgTime
      }
    })
  } catch (e: any) {
    console.error('❌ Error calculating statistics:', e)
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// GET /api/test-submissions - Get all test submissions
app.get('/api/test-submissions', async (req, res) => {
  try {
    const secId = req.query.secId ? String(req.query.secId) : undefined
    
    const where = secId ? { secId } : {}
    const submissions = await prisma.testSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' }
    })

    return res.json({ success: true, data: submissions })
  } catch (e: any) {
    console.error('❌ Error fetching test submissions:', e)
    return res.status(500).json({ success: false, message: e?.message || 'internal_error' })
  }
})

// ========== Help Request Endpoints ==========

// POST /api/help-requests - SEC users submit help requests
app.post('/api/help-requests', async (req, res) => {
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
      return res.status(403).json({ success: false, message: 'Only SEC users can submit help requests' })
    }

    const { requestType, description, storeId } = req.body

    if (!requestType || !description) {
      return res.status(400).json({ success: false, message: 'Request type and description are required' })
    }

    // Validate request type
    const validTypes = ['voucher_issue', 'general_assistance']
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({ success: false, message: 'Invalid request type' })
    }

    // Fetch SEC user details
    const secUser = await prisma.sECUser.findUnique({
      where: { id: decoded.userId }
    })

    if (!secUser) {
      return res.status(404).json({ success: false, message: 'SEC user not found' })
    }

    // Create help request
    const helpRequest = await prisma.helpRequest.create({
      data: {
        secUserId: decoded.userId,
        secPhone: secUser.phone,
        secName: secUser.name || null,
        requestType,
        description,
        storeId: storeId || null,
        status: 'pending'
      }
    })

    console.log(`✅ Help request created: ${helpRequest.id} by SEC ${secUser.phone}`)
    
    res.json({
      success: true,
      message: 'Help request submitted successfully',
      data: helpRequest
    })
  } catch (error) {
    console.error('❌ Error creating help request:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit help request',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET /api/help-requests - SEC users view their own requests
app.get('/api/help-requests', async (req, res) => {
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
      return res.status(403).json({ success: false, message: 'Only SEC users can view their help requests' })
    }

    const requests = await prisma.helpRequest.findMany({
      where: { secUserId: decoded.userId },
      include: { store: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('❌ Error fetching help requests:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch help requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET /api/admin/help-requests - Admin view all help requests
app.get('/api/admin/help-requests', async (req, res) => {
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

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const { status } = req.query
    const where: any = {}
    if (status && typeof status === 'string') {
      where.status = status
    }

    const requests = await prisma.helpRequest.findMany({
      where,
      include: { store: true },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ Admin fetched ${requests.length} help requests`)
    res.json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('❌ Error fetching help requests for admin:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch help requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// PUT /api/admin/help-requests/:id - Admin update help request
app.put('/api/admin/help-requests/:id', async (req, res) => {
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

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const { id } = req.params
    const { status, adminNotes } = req.body

    const updateData: any = {}
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    
    if (status === 'resolved') {
      updateData.resolvedBy = decoded.username || decoded.userId
      updateData.resolvedAt = new Date()
    }

    const helpRequest = await prisma.helpRequest.update({
      where: { id },
      data: updateData
    })

    console.log(`✅ Help request ${id} updated by admin ${decoded.username}`)
    res.json({
      success: true,
      message: 'Help request updated successfully',
      data: helpRequest
    })
  } catch (error) {
    console.error('❌ Error updating help request:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update help request',
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
