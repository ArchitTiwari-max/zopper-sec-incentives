# Authentication Flow Explanation

## Current System Overview

The application has **TWO separate authentication systems**:

### 1. Main App Authentication (SEC/Admin)
Used for the main incentive tracking application

### 2. Pitch Sultan Authentication (Simplified)
Used for the Pitch Sultan video platform

---

## Main App Authentication (SEC/Admin)

### For SEC Users (Sales Executives)

**Flow:**
1. User visits `/` (Login page)
2. Enters phone number
3. System sends OTP via Comify WhatsApp API
4. User enters OTP
5. System verifies OTP
6. Creates/updates `SECUser` in database
7. Stores auth data in localStorage:
   ```javascript
   {
     role: 'sec',
     token: 'jwt_token',
     user: {
       id: 'user_id',
       phone: '1234567890',
       name: 'User Name',
       storeId: 'store_id'
     }
   }
   ```

**API Endpoints:**
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login

**Storage:**
- localStorage key: `auth`
- Contains: JWT token, user role, user data

### For Admin Users

**Flow:**
1. User visits `/admin-login`
2. Enters username and password
3. System verifies credentials against `AdminUser` table
4. Stores auth data in localStorage with JWT token

**API Endpoint:**
- `POST /api/auth/admin-login` - Admin login with username/password

---

## Pitch Sultan Authentication (Simplified)

### Current Implementation

**No traditional authentication!** Instead, it uses a **profile-based system**:

**Flow:**
1. User visits `/pitchsultan/setup`
2. System checks if SEC user is logged in (from main app)
3. If logged in, gets phone number from `useAuth()` context
4. User enters:
   - Name
   - Store selection
   - Region selection
5. System creates `PitchSultanUser` in database:
   ```javascript
   {
     name: "User Name",
     phone: "1234567890", // from SEC auth
     storeId: "store_id",
     region: "north"
   }
   ```
6. Stores user data in localStorage:
   ```javascript
   localStorage.setItem('pitchSultanUser', JSON.stringify({
     id: "user_id",
     name: "User Name",
     store: { id, name, city },
     region: "north"
   }));
   ```

**Key Points:**
- ✅ Leverages existing SEC authentication (phone number)
- ✅ No separate login required
- ✅ Simple localStorage-based session
- ❌ No JWT tokens for Pitch Sultan
- ❌ No password required
- ❌ Session persists until localStorage is cleared

---

## How Video Upload Authentication Works

### Current Flow:

1. **User Setup** (One-time):
   ```
   /pitchsultan/setup
   ↓
   Create PitchSultanUser in DB
   ↓
   Store user ID in localStorage
   ```

2. **Video Upload**:
   ```
   User clicks "Upload Video"
   ↓
   VideoUploadModal reads userId from localStorage
   ↓
   Upload to ImageKit (no auth needed - public upload)
   ↓
   Save metadata to MongoDB with userId
   ```

3. **Video Fetch**:
   ```
   Page loads
   ↓
   Fetch videos from /api/pitch-sultan/videos
   ↓
   No authentication required (public endpoint)
   ↓
   Display videos with user info
   ```

---

## Security Considerations

### Current Issues:

1. **No API Authentication**: 
   - Video endpoints are public
   - Anyone can fetch/create videos if they have a userId
   - No JWT validation on Pitch Sultan endpoints

2. **localStorage Only**:
   - Easy to manipulate
   - No server-side session validation
   - Can be cleared/modified by user

3. **No Authorization**:
   - Users can't edit/delete only their videos
   - No ownership verification

### Recommended Improvements:

#### Option 1: Reuse Main App Auth (Recommended)
```javascript
// In video upload/fetch
const auth = getAuth(); // Get from main app
if (!auth || auth.role !== 'sec') {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Use auth.user.phone to link to PitchSultanUser
```

#### Option 2: Add JWT for Pitch Sultan
```javascript
// During setup, generate JWT
const token = jwt.sign(
  { userId: pitchSultanUser.id, phone: user.phone },
  JWT_SECRET,
  { expiresIn: '30d' }
);

// Store token
localStorage.setItem('pitchSultanToken', token);

// Validate on API calls
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, JWT_SECRET);
```

#### Option 3: Session-Based Auth
```javascript
// Store session in MongoDB
const session = await prisma.pitchSultanSession.create({
  data: {
    userId: user.id,
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
});

// Validate session on each request
```

---

## Code Locations

### Main App Auth:
- **Context**: `src/contexts/AuthContext.tsx`
- **Login Page**: `src/pages/Login.tsx`
- **Admin Login**: `src/pages/AdminLogin.tsx`
- **API**: `api/server.ts` (search for `/api/auth/`)
- **Storage**: `src/lib/auth.ts`

### Pitch Sultan Auth:
- **Setup Page**: `src/pages/PitchSultanSetup.tsx`
- **Battle Page**: `src/pages/PitchSultanBattle.tsx`
- **API**: `api/server.ts` (search for `/api/pitch-sultan/`)
- **Storage**: localStorage directly (no helper functions)

---

## Summary

**Current State:**
- Main app: ✅ Proper authentication with OTP/JWT
- Pitch Sultan: ⚠️ Simple localStorage-based profile system
- Video uploads: ⚠️ No authentication on API endpoints

**Why the warning appears:**
- You visited `/pitchsultan/battle` directly
- No user data in localStorage
- System allows browsing but not saving videos

**To fix:**
1. Visit `/pitchsultan/setup` first
2. Complete the profile setup
3. Now videos will be linked to your user ID
