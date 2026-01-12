# How to Run MongoDB Queries

## You have 2 options:

---

## Option 1: Use the Fix Script (EASIEST)

I created a file called `fix-screenshots.js` for you.

### Step 1: Get your MongoDB connection string from .env
```bash
cat .env | grep DATABASE_URL
```

### Step 2: Run the script
```bash
mongosh "YOUR_CONNECTION_STRING_HERE" --file fix-screenshots.js
```

**Example:**
```bash
mongosh "mongodb+srv://user:password@cluster.mongodb.net/IncentiveData" --file fix-screenshots.js
```

This will automatically:
- Find submissions without screenshots
- Get screenshot URLs from ProctoringEvent
- Update TestSubmission with the URLs
- Show you the results

---

## Option 2: Use MongoDB Compass (GUI - EASIER)

1. Open **MongoDB Compass** app
2. Connect using your connection string from `.env`
3. Click on your database (probably `IncentiveData`)
4. Click on `ProctoringEvent` collection
5. You'll see the screenshot records!
6. Click on `TestSubmission` collection  
7. Find the submission and manually add screenshotUrls

---

## Option 3: MongoDB Shell (mongosh)

### Step 1: Open MongoDB shell
```bash
mongosh "YOUR_CONNECTION_STRING_HERE"
```

### Step 2: Then run queries one by one:
```javascript
// Check if screenshots exist
db.ProctoringEvent.countDocuments({ eventType: "snapshot" })

// See a screenshot record
db.ProctoringEvent.findOne({ eventType: "snapshot" })

// Find submission without screenshots
db.TestSubmission.findOne({ screenshotUrls: [] })
```

---

## 🎯 RECOMMENDED: Use Option 1 (the script)

Just copy your DATABASE_URL from .env and run:
```bash
mongosh "YOUR_DATABASE_URL" --file fix-screenshots.js
```

It will do everything automatically!
