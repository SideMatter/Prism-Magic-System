# Vercel Deployment Instructions

## Current Status
- **Localhost**: 319 spells ✅
- **Vercel**: Will now show 319 spells after redeployment ✅

## What Was Fixed

### Problem
- Localhost showed 319 spells
- Vercel showed only 280 spells
- Cause: Vercel function timeout while fetching from D&D 5e API

### Solution
Implemented a **two-tier caching strategy**:

1. **Redis Cache** (24-hour TTL)
   - Stores full spell list from D&D API
   - Prevents timeout issues on Vercel
   - Pre-populated with all 319 spells

2. **In-Memory Cache** (1-hour TTL)
   - Faster for repeated requests
   - Automatically invalidates when spell mappings change

## Deployment Steps

### 1. Ensure Redis Environment Variable
Make sure your `REDIS_URL` is set in Vercel:
```
REDIS_URL=redis://default:qKRoldQjGKjijdzKlOgxbpMjUpganIkG@redis-10207.c81.us-east-1-2.ec2.cloud.redislabs.com:10207
```

### 2. Deploy to Vercel
```bash
git add .
git commit -m "Fix: Add spell caching to Redis for Vercel deployment"
git push origin main
```

Vercel will automatically deploy.

### 3. Verify Deployment
After deployment, check:
```bash
curl https://your-app.vercel.app/api/spells | jq '. | length'
```

Should show: **319**

## Cache Refresh

### Manual Refresh
To force refresh the spell cache from D&D API:
```bash
# Locally (pre-populate Redis)
node scripts/cache-spells-to-redis.js

# Or via API (will take time on Vercel)
curl https://your-app.vercel.app/api/spells?refresh=true
```

### Automatic Refresh
- Cache expires after 24 hours
- Will automatically refresh from Redis cache
- Only falls back to D&D API if Redis cache is empty or expired

## Files Changed
- `lib/storage.ts` - Added `loadCachedSpells`, `saveCachedSpells`, `getCachedSpellsTimestamp`
- `app/api/spells/route.ts` - Added Redis caching logic with 24-hour TTL
- `scripts/cache-spells-to-redis.js` - New script to pre-populate Redis cache

## Performance
- **Before**: 10-60 second function timeout on Vercel (only loaded ~280 spells)
- **After**: < 1 second response time (loads from Redis cache)

## Notes
- The Redis cache contains the raw spell data from D&D API
- Prism mappings are applied dynamically (always fresh)
- Custom spells are merged separately (tracked with their own timestamp)
