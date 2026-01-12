# Database Test for Screenshots

## Run This Test

### 1. Test if database connection works

Open your browser and visit:
```
http://localhost:3001/api/proctoring/event
```

POST this data (use Postman or curl):
```bash
curl -X POST http://localhost:3001/api/proctoring/event \
  -H "Content-Type: application/json" \
  -d '{
    "secId": "TEST123",
    "sessionToken": "test-session-token",
    "eventType": "snapshot",
    "details": "https://res.cloudinary.com/test/image/upload/v123/test.jpg"
  }'
```

### 2. Check server console

You should see:
```
📸 ========================================
📸 RECEIVING SNAPSHOT EVENT  
📸 SEC ID: TEST123
📸 Session Token: test-session-token
📸 Cloudinary URL: https://res.cloudinary.com/test/image/upload/v123/test.jpg
📸 ========================================
✅ Snapshot event saved to database with ID: 679c...
✅ URL in database: https://res.cloudinary.com/test/image/upload/v123/test.jpg
```

### 3. Check MongoDB

```javascript
db.ProctoringEvent.findOne({ secId: "TEST123" })
```

**Expected:**
```json
{
  "_id": "679c...",
  "secId": "TEST123",
  "sessionToken": "test-session-token",
  "eventType": "snapshot",
  "details": "https://res.cloudinary.com/test/image/upload/v123/test.jpg",
  "createdAt": "2026-01-12..."
}
```

### If This Works:
✅ Database connection is fine
✅ The issue is in the frontend calling the API

### If This Fails with "Proctoring DB write failed":
❌ There's a database connection issue
❌ Check your .env DATABASE_URL

### If MongoDB query returns null:
❌ Data is not being saved
❌ Check Prisma is connected to correct database

---

## Then Check During Real Test

1. Start a real SEC test
2. Watch **server console** (where you ran `npm run dev:full`)
3. Look for the logs above within 20-45 seconds
4. If you DON'T see the logs, the frontend is not calling the API
5. If you DO see the logs, database should have the records

Tell me what happens!
