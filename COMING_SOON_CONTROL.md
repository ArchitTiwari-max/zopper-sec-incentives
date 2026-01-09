# Coming Soon Page Control

## Current Status
✅ **DISABLED** - Real Pitch Sultan pages are shown in both development and production

## How to Re-enable Coming Soon Page for Production

### Option 1: Environment-based Control (Recommended)
In `src/App.tsx`, change the routes back to:

```javascript
// Replace this:
<Route path="/pitchsultan" element={
  <SECRoute>
    <PitchSultan />
  </SECRoute>
} />

// With this:
<Route path="/pitchsultan" element={
  <SECRoute>
    {import.meta.env.DEV ? <PitchSultan /> : <ComingSoon />}
  </SECRoute>
} />
```

**Apply to all 5 routes:**
- `/pitchsultan`
- `/pitchsultan/setup` 
- `/pitchsultan/battle`
- `/pitchsultan/rules`
- `/pitchsultan/rewards`

### Option 2: Manual Control
Create a feature flag in `src/App.tsx`:

```javascript
// Add at top of App component
const PITCH_SULTAN_ENABLED = true; // Set to false to show ComingSoon

// Use in routes:
{PITCH_SULTAN_ENABLED ? <PitchSultan /> : <ComingSoon />}
```

### Option 3: Environment Variable Control
1. Add to `.env`:
```
VITE_PITCH_SULTAN_ENABLED=true
```

2. Use in routes:
```javascript
{import.meta.env.VITE_PITCH_SULTAN_ENABLED === 'true' ? <PitchSultan /> : <ComingSoon />}
```

## Files Affected
- `src/App.tsx` - Main routing logic
- `src/pages/ComingSoon.tsx` - Coming soon page (kept for future use)

## Notes
- ComingSoon page is preserved and can be re-enabled anytime
- Current setup shows real pages in both dev and production
- Environment-based control is recommended for production deployments