# Kome Question Bank System

## Overview
The system manages a comprehensive question bank for SEC (Samsung Experience Consultant) assessments. Questions are loaded from the `kome-text.pdf` file and stored in the database.

## Question Bank Statistics
- **Total Questions**: 221
- **Total Categories**: 10
- **Questions per Category**:
  - Plan Types & Coverage Basics: 36 questions
  - Claims - Unlimited, Invoice Capping & Depreciation: 32 questions
  - Eligibility & Purchase Window: 21 questions
  - Plan Activation & Cool-off Period: 12 questions
  - Claim Registration Process & Documentation: 37 questions
  - Service & Repair Process: 45 questions
  - Global Coverage: 9 questions
  - Incentives & Schemes: 2 questions
  - Employee Support & Training: 7 questions
  - Sales Strategy & Customer Understanding: 20 questions

## How It Works

### 1. Question Loading
Questions are loaded from the PDF using the script:
```bash
npm run load-questions
```

This script:
- Extracts text from `kome-text.pdf`
- Parses questions by category
- Validates question format (question text, options A-D, correct answer)
- **Deletes all existing questions** from the database
- Inserts the new questions

### 2. Question Selection for Tests
When a SEC user starts a test:
- The system generates **exactly 10 questions** (1 from each of the 10 categories)
- Question selection is **deterministic** based on the SEC's phone number/ID
  - Same SEC always gets the same questions
  - Different SECs get different random questions
- Questions are shuffled in random order (but consistently for the same SEC)

### 3. API Endpoints

#### Get Unique Questions for a SEC
```
GET /api/questions/unique/:secId
```
**Parameters:**
- `secId`: The SEC's phone number or unique identifier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "question": "What is covered under Samsung Care+?",
      "options": [
        "A) Screen damage only",
        "B) Accidental damage and liquid damage",
        "C) Battery replacement only",
        "D) Software issues"
      ],
      "correctAnswer": "B",
      "category": "Plan Types & Coverage Basics"
    }
    // ... 9 more questions
  ],
  "meta": {
    "totalQuestions": 10,
    "categoriesCount": 10,
    "questionsPerCategory": 1,
    "secId": "9876543210"
  }
}
```

#### Get All Questions (Admin)
```
GET /api/questions
```
Returns all 221 questions from the database.

### 4. Test Submission & Results

When a SEC submits their test:
- **Server-side validation**: The server validates answers against the database
- **Score calculation**: Score is calculated on the server (not trusted from client)
- **Data snapshot**: Complete question details are stored with the submission
  - Question text
  - All options
  - Correct answer
  - User's selected answer
  - Whether it was correct

This ensures:
- Historical accuracy (old results remain valid even if questions change)
- Security (users can't manipulate scores)
- Complete audit trail

### 5. Viewing Results

#### SEC User View
- SECs can view their own test results at `/results`
- Shows their score, time taken, and detailed answer review
- Can review which questions they got right/wrong

#### Admin View
- Admins can view all SEC test results at `/admin/test-results`
- Export results to Excel
- View detailed answer breakdowns for each SEC
- See statistics (average score, pass rate, etc.)
- View question-wise analytics (which questions are hardest)

## Database Schema

### QuestionBank Model
```prisma
model QuestionBank {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  questionId    Int      @unique // Sequential question ID
  question      String   // Question text
  options       String[] // Array of options (e.g., ["A) Option1", "B) Option2", ...])
  correctAnswer String   // Correct answer letter (e.g., "A", "B", "C", "D")
  category      String?  // Category name
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([category])
}
```

### TestSubmission Model
```prisma
model TestSubmission {
  id                   String   @id @default(auto()) @map("_id") @db.ObjectId
  secId                String
  phone                String?
  name                 String?
  sessionToken         String
  responses            Json     // Array of enriched response objects
  score                Int
  totalQuestions       Int
  completionTime       Int      // in seconds
  isProctoringFlagged  Boolean  @default(false)
  screenshotUrls       String[] @default([])
  storeId              String?
  storeName            String?
  storeCity            String?
  submittedAt          DateTime @default(now())
  createdAt            DateTime @default(now())

  @@index([secId])
  @@index([phone])
  @@index([submittedAt])
  @@index([secId, sessionToken])
}
```

## Maintenance

### Updating Questions
To update questions from the PDF:
1. Replace `kome-text.pdf` with the new PDF
2. Run: `npm run load-questions`
3. Verify the output shows the correct number of questions per category

**⚠️ Warning**: This will delete all existing questions and reload from the PDF.

### Adding New Categories
If the PDF structure changes to include new categories:
1. Update the PDF parsing logic in `scripts/load-kome-questions.ts` if needed
2. Run `npm run load-questions`
3. The system will automatically adapt to the new number of categories

## Security Features
- Server-side answer validation (users cannot manipulate scores)
- Deterministic question selection (prevents gaming the system)
- Complete audit trail (all submissions are logged with full details)
- Data snapshots (historical results remain accurate)

## Performance
- Questions are cached in memory after first load
- Deterministic selection avoids database queries for randomization
- Efficient indexing on category field for fast lookups
