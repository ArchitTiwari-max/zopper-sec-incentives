# Simplified Authentication - Final Implementation

## What Changed

### ❌ Removed:
- `PitchSultanUser` model (separate table)
- Duplicate user data
- Complex user linking

### ✅ Added:
- `region` field to `SECUser` (optional)
- Direct link from `PitchSultanVideo` to `SECUser`

## New Database Schema

### SECUser (One User Model for Everything)
```prisma
model SECUser {
  id           String        @id
  phone        String        @unique
  secId        String?
  name         String?
  storeId      String?
  store        Store?
  region       String?       // NEW: For Pitch Sultan
  isActive     Boolean
  lastLoginAt  DateTime?
  salesReports SalesReport[]
  deductions   IncentiveDeduction[]
  videos       PitchSultanVideo[]  // NEW: Videos
  createdAt    DateTime
  updatedAt    DateTime
}
```

### PitchSultanVideo (Links to SECUser)
```prisma
model PitchSultanVideo {
  id           String   @id
  secUserId    String   // Links to SECUser.id
  secUser      SECUser  // Relation
  fileId       String
  url          String
  fileName     String
  views        Int
  likes        Int
  // ... other fields
}
```

## Authentication Flow

### 1. Login (Same as Before)
```
User enters phone → OTP via WhatsApp → Verify → SECUser created/updated
```

### 2. Stored in localStorage
```javascript
localStorage.setItem('spot_incentive_auth', JSON.stringify({
  token: "jwt_token",
  role: "sec",
  user: {
    secId: "SEC123",
    phone: "1234567890",
    name: "User Name",
    storeId: "store_id"
  }
}))
```

### 3. Pitch Sultan Setup (First Time Only)
```
User visits /pitchsultan/setup
↓
Enters name, region, store
↓
Updates SECUser with: name, region, storeId
↓
Redirects to /pitchsultan/battle
```

### 4. Upload Video
```
User uploads video
↓
Saves to PitchSultanVideo with secUserId
↓
Video linked to SECUser
```

## API Changes

### Before:
```javascript
POST /api/pitch-sultan/user
// Created PitchSultanUser

GET /api/pitch-sultan/user?phone=xxx
// Fetched PitchSultanUser
```

### After:
```javascript
POST /api/pitch-sultan/user
// Updates SECUser (adds name, region)

GET /api/pitch-sultan/user?phone=xxx
// Fetches SECUser
```

## Benefits

### 1. Single Source of Truth
- ✅ One user model (`SECUser`)
- ✅ One authentication system
- ✅ No duplicate data

### 2. Simpler Code
- ✅ No user linking logic
- ✅ Fewer database queries
- ✅ Easier to maintain

### 3. Better Data Integrity
- ✅ Phone number is unique
- ✅ One user record per person
- ✅ Consistent user data

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Unified Authentication Flow                 │
└─────────────────────────────────────────────────────────┘

1. User Login (OTP)
   ↓
2. SECUser created/updated in database
   ↓
3. JWT token + user data stored in localStorage
   key: 'spot_incentive_auth'
   ↓
4. User accesses main app features
   - Report sales
   - View leaderboard
   - Check incentives
   ↓
5. User clicks "Pitch Sultan"
   ↓
6. Check if SECUser has name + region
   ├─ Yes → Go to /pitchsultan/battle
   └─ No → Go to /pitchsultan/setup
   ↓
7. Setup (if needed)
   - Enter name
   - Select region
   - Select store
   ↓
8. Update SECUser with Pitch Sultan info
   ↓
9. Battle Page
   - View videos
   - Upload videos (linked to SECUser.id)
   - All features available
```

## Summary

**Before:**
- 2 user models (SECUser + PitchSultanUser)
- 2 authentication systems
- Complex linking by phone

**After:**
- 1 user model (SECUser)
- 1 authentication system
- Simple and clean

**Single Source of Truth:**
```
spot_incentive_auth in localStorage
↓
Contains JWT token + SECUser data
↓
Used by entire application
↓
Main app + Pitch Sultan
```

**One user, one login, entire application!** 🎯
