// MongoDB Script to Fix Screenshots
// Run this with: mongosh your-connection-string < fix-screenshots.js

print("🔍 Finding latest test submission without screenshots...\n");

// 1. Find submission with no screenshots
var submission = db.TestSubmission.findOne(
    { screenshotUrls: [] },
    { _id: 1, secId: 1, submittedAt: 1, sessionToken: 1 }
);

if (!submission) {
    print("❌ No submissions found without screenshots");
    quit();
}

print("Found submission:");
print("  ID:", submission._id);
print("  SEC ID:", submission.secId);
print("  Session Token:", submission.sessionToken);
print("  Submitted At:", submission.submittedAt);

// 2. Find screenshot URLs for this SEC
print("\n🔍 Looking for screenshots...\n");

var screenshots = db.ProctoringEvent.find({
    secId: submission.secId,
    eventType: "snapshot"
}).toArray();

print("Found", screenshots.length, "proctoring snapshot events");

if (screenshots.length === 0) {
    print("❌ No screenshots found for this SEC");
    quit();
}

var urls = screenshots.map(s => s.details).filter(d => d && d.startsWith('http'));

print("\n📸 Screenshot URLs found:", urls.length);
urls.forEach((url, i) => {
    print("  " + (i + 1) + ".", url.substring(0, 80) + "...");
});

// 3. Update submission with URLs
print("\n💾 Updating submission with screenshot URLs...");

var result = db.TestSubmission.updateOne(
    { _id: submission._id },
    { $set: { screenshotUrls: urls } }
);

if (result.modifiedCount > 0) {
    print("\n✅ SUCCESS! Updated submission with", urls.length, "screenshot URLs");
    print("\n🎉 Go check the admin page now!");
} else {
    print("\n❌ Update failed");
}

// Verify
print("\n✅ Verification:");
var updated = db.TestSubmission.findOne({ _id: submission._id }, { screenshotUrls: 1 });
print("  Screenshots in database:", updated.screenshotUrls.length);
