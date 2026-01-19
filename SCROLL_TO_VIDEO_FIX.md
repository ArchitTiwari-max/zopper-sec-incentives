# Scroll to Video Fix - Clicking from Home Feed ✅

## Problem
When clicking video 1050 from home feed, ShortsPlayer was scrolling to the AD instead of to video 1050.

**Root Cause**: The programmatic scroll was using array index to find the DOM element, but:
- `contentItems[8]` = video 1050 (correct)
- `containerRef.current.children[8]` = AD (wrong! because ads are also in DOM)

Since ads are rendered in the DOM, the DOM children array includes both videos AND ads, but the `contentItems` array only has videos. This caused an index mismatch.

## Solution
**Use a data attribute to identify videos and search by video ID instead of index**

### Changes Made

#### 1. Added data-video-id attribute to video element
```jsx
<video
    src={getOptimizedVideoUrl(video.url)}
    data-video-id={video.id}  // ← Added this
    ...
/>
```

#### 2. Updated scroll logic to search by video ID
```typescript
// Before (WRONG - uses index):
const targetVideo = containerRef.current.children[startIndex];

// After (CORRECT - searches by video ID):
let targetElement: HTMLElement | null = null;
for (let i = 0; i < containerRef.current.children.length; i++) {
    const child = containerRef.current.children[i] as HTMLElement;
    const videoElement = child.querySelector('video[data-video-id]') as HTMLVideoElement;
    if (videoElement && videoElement.dataset.videoId === startingVideoId) {
        targetElement = child;
        break;
    }
}

if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

## Result
✅ Clicking video 1050 from home feed now scrolls directly to video 1050
✅ No more scrolling to ads when clicking from home feed
✅ Correct video is displayed immediately
✅ Ad placement remains correct (after every 8 videos)

## Testing
1. Click video 1050 from home feed → Should show video 1050 immediately
2. Click video 1043 from home feed → Should show video 1043 immediately
3. Scroll down from any clicked video → Should see ads in correct positions

## Files Modified
- `src/components/ShortsPlayer.tsx` - Added data-video-id attribute and updated scroll logic
