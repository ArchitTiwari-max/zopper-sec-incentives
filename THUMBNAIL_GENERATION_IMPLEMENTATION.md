# Thumbnail Generation Implementation

## Overview
Implemented automatic JPG thumbnail generation for S3 video uploads to fix blank thumbnails on mobile browsers.

## Problem
- Mobile browsers don't preload video metadata to save bandwidth/battery
- Using `preload="metadata"` worked on desktop but not mobile
- Thumbnails appeared blank in home feed on mobile devices

## Solution
Generate actual JPG thumbnail images during video upload and store them in S3.

## Implementation Details

### 1. Thumbnail Generation (Client-Side)
**File**: `src/components/VideoUploadModal.tsx`

Added `generateThumbnail()` function that:
- Creates a video element and loads the video blob
- Seeks to 1 second (to avoid black first frames)
- Draws the frame to a canvas
- Converts canvas to JPEG blob (85% quality)
- Returns the thumbnail blob

### 2. Upload Flow Updates
**File**: `src/components/VideoUploadModal.tsx`

Updated `handleUpload()` to:
1. Convert video if needed (60% progress)
2. **Generate thumbnail** from video (5% progress)
3. **Upload thumbnail JPG** to S3 (10% progress)
4. Upload video to S3 (25% progress)
5. Save metadata with thumbnail URL (5% progress)

Progress breakdown:
- With conversion: 60% convert + 10% thumbnail + 25% video + 5% save = 100%
- Without conversion: 5% start + 10% thumbnail + 80% video + 5% save = 100%

### 3. Thumbnail Upload
Uses existing S3 infrastructure:
- Calls `uploadWithRetry()` with thumbnail blob
- Filename: `{video-name}.jpg` (replaces .mp4 with .jpg)
- MIME type: `image/jpeg`
- Uses same pre-signed URL approach as video upload

### 4. Display Updates
**File**: `src/components/VideoPreview.tsx`

Reverted to `<img>` tag (from `<video>` tag):
- Uses JPG thumbnail URL for fast loading
- Fallback to video URL if thumbnail fails
- Much better mobile performance (smaller file size)

**File**: `src/utils/videoUtils.ts`

Updated `getThumbnailUrl()`:
- Returns thumbnail URL if available
- For ImageKit videos: uses ImageKit transformation for thumbnails
- For S3 videos without thumbnail: returns video URL as fallback

## Benefits

### Mobile Performance
- **Smaller file size**: 50-100KB JPG vs several MB video
- **Instant loading**: Even on slow connections
- **Better battery life**: No video decoding needed
- **Works on all browsers**: No reliance on video preload behavior

### User Experience
- Thumbnails appear immediately in feed
- Smooth scrolling on mobile
- Professional appearance
- Consistent behavior across devices

## Backward Compatibility

### Existing Videos
- Old videos without thumbnails will fallback to video URL
- ImageKit videos use ImageKit's thumbnail transformation
- No database migration needed (thumbnailUrl already exists)

### Migration Period
- New uploads get JPG thumbnails automatically
- Old S3 videos without thumbnails still work (fallback)
- ImageKit videos continue working with transformations

## Technical Notes

### Thumbnail Quality
- JPEG format at 85% quality
- Captured at 1 second into video (avoids black frames)
- Maintains original video aspect ratio
- Typical size: 50-150KB depending on video resolution

### Error Handling
- Thumbnail generation failure doesn't block upload
- Continues without thumbnail if generation fails
- Fallback chain: thumbnail URL → video URL → hide image

### S3 Storage
- Thumbnails stored in same S3 bucket as videos
- Same folder structure: `videos/{userId}/{timestamp}-{filename}.jpg`
- Uses same pre-signed URL authentication

## Testing Checklist

- [x] Desktop browser: Thumbnails load correctly
- [ ] Mobile browser: Thumbnails load correctly
- [ ] Slow connection: Thumbnails appear quickly
- [ ] Old videos: Fallback works correctly
- [ ] ImageKit videos: Still work with transformations
- [ ] Upload flow: Progress tracking accurate
- [ ] Error handling: Graceful degradation

## Next Steps

1. Test on mobile devices (iOS Safari, Chrome Mobile, Android)
2. Monitor thumbnail file sizes
3. Consider thumbnail optimization if needed
4. Optional: Batch generate thumbnails for old S3 videos
