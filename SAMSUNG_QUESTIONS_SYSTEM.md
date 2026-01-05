# Samsung ProtectMax Questions System

This document explains how to set up and use the Samsung ProtectMax 10-category question system that ensures each SEC gets unique questions from all categories.

## Overview

The system provides:
- **10 Categories**: Each with multiple questions from the Samsung ProtectMax PDF
- **Unique Distribution**: Each SEC gets different questions from each category
- **Deterministic Selection**: Same SEC always gets the same questions (consistent experience)
- **One Question Per Category**: Ensures comprehensive coverage of all topics

## Files Created

1. **`scripts/load-samsung-questions.ts`** - Script to load questions into database
2. **API Endpoint** - `/api/questions/unique/:secId` - Get unique questions for each SEC
3. **Database Schema** - Uses existing `QuestionBank` model with category support

## Setup Instructions

### Step 1: Extract Questions from PDF

1. Open `Samsung_ProtectMax_10_Categories_Full_QA.pdf`
2. Extract questions from each of the 10 categories
3. Update the `samsungQuestions` object in `scripts/load-samsung-questions.ts`

**Example format for each category:**
```typescript
"Category Name": [
  {
    question: "Your question text here?",
    options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    correctAnswer: "B"
  },
  // Add more questions...
]
```

### Step 2: Load Questions into Database

Run the script to load questions:

```bash
# Load questions into database
tsx scripts/load-samsung-questions.ts load

# Test the distribution system
tsx scripts/load-samsung-questions.ts test

# Generate questions for a specific SEC
tsx scripts/load-samsung-questions.ts generate SEC001
```

### Step 3: Update Frontend to Use New API

Update your test component to use the new API endpoint:

```javascript
// Instead of fetching all questions
const response = await fetch('/api/questions')

// Use the unique questions endpoint
const response = await fetch(`/api/questions/unique/${secId}`)
```

## How It Works

### Question Distribution Algorithm

1. **Category-Based Selection**: System gets all available categories from database
2. **Deterministic Hashing**: Uses SEC ID to generate a consistent hash
3. **Index Calculation**: `hash % questionsInCategory` selects specific question
4. **Consistent Results**: Same SEC always gets same questions
5. **Unique Distribution**: Different SECs get different questions

### Example Distribution

```
SEC001 gets: Q1 from Cat1, Q3 from Cat2, Q2 from Cat3...
SEC002 gets: Q2 from Cat1, Q1 from Cat2, Q4 from Cat3...
SEC003 gets: Q3 from Cat1, Q4 from Cat2, Q1 from Cat3...
```

## API Usage

### Get Unique Questions for SEC

**Endpoint:** `GET /api/questions/unique/:secId`

**Example Request:**
```bash
curl http://localhost:3001/api/questions/unique/SEC001
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "question": "What is the main benefit of Samsung ProtectMax?",
      "options": ["A) Water resistance", "B) Impact protection", "C) Battery life", "D) Camera enhancement"],
      "correctAnswer": "B",
      "category": "Product Knowledge"
    },
    // ... 9 more questions (one from each category)
  ],
  "meta": {
    "totalQuestions": 10,
    "categoriesCount": 10,
    "secId": "SEC001"
  }
}
```

## Database Schema

The system uses the existing `QuestionBank` model:

```prisma
model QuestionBank {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  questionId    Int      @unique
  question      String
  options       String[]
  correctAnswer String
  category      String?  // Used for 10 categories
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Testing the System

### Test Question Distribution

```bash
# Test with multiple SECs
tsx scripts/load-samsung-questions.ts test
```

This will show how questions are distributed across different SECs:

```
📋 Testing for SEC001:
   📊 Questions by category: { "Product Knowledge": 1, "Technical Specs": 1, ... }
   🎯 Total questions: 10

📋 Testing for SEC002:
   📊 Questions by category: { "Product Knowledge": 1, "Technical Specs": 1, ... }
   🎯 Total questions: 10
```

### Verify Unique Distribution

```bash
# Generate questions for specific SECs
tsx scripts/load-samsung-questions.ts generate SEC001
tsx scripts/load-samsung-questions.ts generate SEC002
```

Compare the outputs to ensure different SECs get different questions.

## Integration with Test System

### Frontend Integration

Update your test component to use the new endpoint:

```javascript
// In your test component
const fetchQuestionsForSEC = async (secId) => {
  try {
    const response = await fetch(`/api/questions/unique/${secId}`)
    const result = await response.json()
    
    if (result.success) {
      setQuestions(result.data)
      console.log(`Loaded ${result.meta.totalQuestions} unique questions for ${secId}`)
    } else {
      console.error('Failed to load questions:', result.message)
    }
  } catch (error) {
    console.error('Error fetching questions:', error)
  }
}

// Call when starting test
useEffect(() => {
  if (secId) {
    fetchQuestionsForSEC(secId)
  }
}, [secId])
```

### Test Submission Integration

The existing test submission system will work without changes since it uses the same question format.

## Maintenance

### Adding New Questions

1. Update `scripts/load-samsung-questions.ts` with new questions
2. Run the load script: `tsx scripts/load-samsung-questions.ts load`
3. Test distribution: `tsx scripts/load-samsung-questions.ts test`

### Updating Categories

1. Add new categories to the `samsungQuestions` object
2. Ensure each category has sufficient questions for unique distribution
3. Reload questions into database

## Benefits

✅ **Unique Experience**: Each SEC gets different questions  
✅ **Comprehensive Coverage**: One question from each of 10 categories  
✅ **Consistent Results**: Same SEC always gets same questions  
✅ **Fair Distribution**: No SEC gets easier/harder questions  
✅ **Scalable**: Works with any number of SECs  
✅ **Maintainable**: Easy to add new questions and categories  

## Next Steps

1. **Extract Questions**: Get all questions from the Samsung PDF
2. **Populate Data**: Update the script with actual questions
3. **Load Database**: Run the load script
4. **Update Frontend**: Integrate with your test component
5. **Test System**: Verify unique distribution works correctly

## Troubleshooting

### No Questions Found
- Ensure questions are loaded: `tsx scripts/load-samsung-questions.ts load`
- Check database connection in the script

### Same Questions for Different SECs
- Verify the hash function is working correctly
- Check that categories have multiple questions

### Missing Categories
- Ensure all 10 categories are populated in the script
- Verify category names match between script and database

## Support

For issues or questions about this system, check:
1. Database connection and question loading
2. API endpoint responses
3. Frontend integration
4. Question distribution algorithm