# Quick Test - Run This After Taking a Test

## Step 1: Check if Proctoring Events Exist

Run this in MongoDB:

```javascript
// Find all snapshot events
db.ProctoringEvent.find({ eventType: "snapshot" }).sort({ createdAt: -1 }).limit(5).pretty()
```

**If you see events:** Good! URLs are being saved to ProctoringEvent ✅

**If empty:** Issue is in saving to database ❌

---

## Step 2: Check Test Submission

```javascript
// Find latest test submission
db.TestSubmission.findOne().sort({ submittedAt: -1 }).pretty()
```

Look for:
- `sessionToken`: Note this value
- `screenshotUrls`: Should have URLs (currently empty)

---

## Step 3: Match Session Tokens

```javascript
// Get sessionToken from latest submission
var submission = db.TestSubmission.findOne({}, { sessionToken: 1 }).sort({ submittedAt: -1 })
print("Submission sessionToken:", submission.sessionToken)

// Find proctoring events with same sessionToken
var events = db.ProctoringEvent.find({ 
  sessionToken: submission.sessionToken,
  eventType: "snapshot"
}).toArray()

print("\nMatching snapshot events:", events.length)
if (events.length > 0) {
  print("\nFirst event details:", events[0].details)
}
```

**Expected:**
- Should find events with matching sessionToken
- events[0].details should be a Cloudinary URL

**If no events found:**
- sessionToken mismatch between test and submission

---

## Step 4: Manual Fix (Temporary)

If events exist but weren't extracted, run this to manually fix one submission:

```javascript
// Get latest submission
var sub = db.TestSubmission.findOne({}, { _id: 1, sessionToken: 1 }).sort({ submittedAt: -1 })

// Get all snapshot events for that session
var snapshots = db.ProctoringEvent.find({
  sessionToken: sub.sessionToken,
  eventType: "snapshot"
}).toArray()

// Extract URLs
var urls = snapshots.map(e => e.details).filter(d => d && d.startsWith('http'))

print("Found URLs:", urls.length)
print("URLs:", JSON.stringify(urls, null, 2))

// Update submission with URLs
db.TestSubmission.updateOne(
  { _id: sub._id },
  { $set: { screenshotUrls: urls } }
)

print("\nUpdated! Check admin page now.")
```

---

## What to Tell Me

After running these queries, tell me:

1. **Do ProctoringEvent snapshot records exist?** (Yes/No)
2. **Do they have full Cloudinary URLs in details field?** (Yes/No)  
3. **Does the sessionToken match between ProctoringEvent and TestSubmission?** (Yes/No)
4. **Did the manual fix work?** (Did admin page show screenshots?)

This will tell me EXACTLY where the issue is!
