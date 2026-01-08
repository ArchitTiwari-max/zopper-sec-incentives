# Current User Explanation

## What is `currentUser`?

`currentUser` is the logged-in Pitch Sultan user's information that is stored in the browser's localStorage and used throughout the Pitch Sultan Battle page.

## User Flow

### 1. Landing Page (`/pitchsultan`)
- User sees the Pitch Sultan landing page
- Clicks "Enter the Battle" button

### 2. Setup Page (`/pitchsultan/setup`)
- User enters their details:
  - Name
  - Store selection
  - Region selection
- On submit, creates a `PitchSultanUser` in the database
- Stores user data in localStorage:
  ```javascript
  localStorage.setItem('pitchSultanUser', JSON.stringify({
    id: "user_id_from_database",
    name: "User Name",
    store: {
      id: "store_id",
      name: "Store Name",
      city: "City"
    },
    region: "north/south/east/west"
  }));
  ```

### 3. Battle Page (`/pitchsultan/battle`)
- Loads user data from localStorage
- Transforms it into `currentUser` object:
  ```javascript
  {
    name: "User Name",
    handle: "@user_name",
    avatar: "https://ui-avatars.com/api/?name=User+Name...",
    subscribers: "1.2K",
    role: "Store Name",
    store: "Store Name",
    region: "north"
  }
  ```
- Uses `currentUser` to:
  - Display user info in navbar
  - Show user profile in profile tab
  - Link uploaded videos to the user

## Current Implementation

### Default User (For Demo)
If no user data exists in localStorage, the page uses a default user:
```javascript
{
  name: "Zopper Champion",
  handle: "@zopper_champ",
  avatar: "https://ui-avatars.com/api/?name=Zopper+Champion&background=ffd700&color=000",
  subscribers: "1.2K",
  role: "SEC Master",
  store: "",
  region: ""
}
```

This allows the page to work even if someone directly visits `/pitchsultan/battle` without going through the setup flow.

### Video Upload Behavior

**With User ID (Normal Flow):**
1. User uploads video
2. Video saved to ImageKit
3. Video metadata saved to MongoDB with `userId`
4. Video appears in feed with user's name and avatar

**Without User ID (Direct Access):**
1. User uploads video
2. Video saved to ImageKit
3. Video NOT saved to database (no userId to link to)
4. Shows warning: "Upload successful! (Not linked to user)"

## How to Test Properly

### Option 1: Full Flow (Recommended)
1. Visit http://localhost:5173/pitchsultan
2. Click "Enter the Battle"
3. Fill in name, store, and region
4. Click "Enter The Battle"
5. Now you're on the battle page with a real user
6. Upload videos - they'll be saved to database

### Option 2: Direct Access (Demo Mode)
1. Visit http://localhost:5173/pitchsultan/battle directly
2. Page loads with default "Zopper Champion" user
3. Can browse videos
4. Can upload videos (but they won't be saved to database)

## Database Schema

The `PitchSultanUser` model in Prisma:
```prisma
model PitchSultanUser {
  id        String              @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  phone     String              @unique
  storeId   String
  store     Store               @relation(fields: [storeId], references: [id])
  region    String
  videos    PitchSultanVideo[]  // Videos uploaded by this user
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt
}
```

## Why This Approach?

1. **No Authentication Required**: Users don't need passwords, just basic info
2. **Quick Onboarding**: Simple 3-field form to get started
3. **Persistent Identity**: User data stored in localStorage
4. **Video Attribution**: Videos linked to users in database
5. **Demo Friendly**: Works even without setup for quick demos

## Future Improvements

1. **Require Setup**: Redirect to setup page if no user data
2. **Phone Verification**: Link to existing SEC users via phone
3. **Session Management**: Use JWT tokens instead of localStorage
4. **Profile Editing**: Allow users to update their info
5. **Multi-Device**: Sync user data across devices
