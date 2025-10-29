# Test Submission Migration to MongoDB

## Summary
Test results are now stored in MongoDB instead of localStorage, making them persistent across devices and accessible from any browser.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
Added new `TestSubmission` model:
```prisma
model TestSubmission {
  id                   String   @id @default(auto()) @map("_id") @db.ObjectId
  secId                String
  sessionToken         String
  responses            Json     // Array of {questionId, selectedAnswer, answeredAt}
  score                Int
  totalQuestions       Int
  completionTime       Int      // in seconds
  isProctoringFlagged  Boolean  @default(false)
  submittedAt          DateTime @default(now())
  createdAt            DateTime @default(now())

  @@index([secId])
  @@index([submittedAt])
}
```

### 2. API Endpoints (`api/server.ts`)
Added three new endpoints:

#### POST `/api/test-submissions`
Submit a test result
```json
{
  "secId": "1234",
  "sessionToken": "test-token",
  "responses": [...],
  "score": 70,
  "totalQuestions": 10,
  "completionTime": 300,
  "isProctoringFlagged": false
}
```

#### GET `/api/test-submissions`
Get all test submissions (optionally filter by secId)
- Query param: `?secId=1234` (optional)

#### GET `/api/test-submissions/statistics`
Get aggregated statistics
```json
{
  "totalSubmissions": 17,
  "averageScore": 45,
  "passRate": 23,
  "averageTime": 120
}
```

### 3. Frontend Updates

#### `src/lib/testData.ts`
- `getTestSubmissions()` - Now async, fetches from API
- `saveTestSubmission()` - Now async, saves to API
- `getTestStatistics()` - Now async, fetches from API

#### `src/pages/AllResults.tsx`
Updated to use async `getTestSubmissions()`

#### `src/pages/AdminTestResults.tsx`
Updated to use async `getTestSubmissions()` and `getTestStatistics()`

## Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Complete a test:**
   - Go to test page and complete a test
   - Result should be saved to MongoDB

3. **View results:**
   - Go to `/results` to see all test results
   - Results should load from MongoDB

4. **Admin view:**
   - Go to admin dashboard
   - View test results and statistics
   - Export to Excel should work with MongoDB data

## Database Status
✅ Schema pushed to MongoDB
✅ Collection `TestSubmission` created
✅ Indexes created on `secId` and `submittedAt`

## Migration Note
Existing localStorage data will not be migrated automatically. If you need to migrate existing test results:
1. Export localStorage data from browser console
2. Use API to bulk import into MongoDB
3. Or manually re-submit tests

## Benefits
- ✅ Persistent storage across devices
- ✅ Accessible from any browser
- ✅ Centralized data management
- ✅ Better scalability
- ✅ Admin can view all results
- ✅ Statistics are calculated from actual data
